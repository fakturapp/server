import { Server as SocketServer, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import { Secret } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import env from '#start/env'
import User from '#models/account/user'
import type { SharePermission } from '#models/collaboration/document_share'

export interface CollaboratorInfo {
  userId: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  permission: SharePermission
  isOwner: boolean
  color: string
}

export interface CursorPosition {
  userId: string
  x: number
  y: number
  fieldId?: string
}

export interface DocumentChange {
  userId: string
  path: string
  value: any
  timestamp: number
}

const CURSOR_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f43f5e',
]

function colorForUser(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length]
}

interface RoomPresence {
  teamId: string | null
  collaborators: Map<string, CollaboratorInfo & { socketId: string }>
}

const rooms = new Map<string, RoomPresence>()

function getRoomKey(documentType: string, documentId: string): string {
  return `${documentType}:${documentId}`
}

function getOrCreateRoom(roomKey: string, teamId: string | null): RoomPresence {
  let room = rooms.get(roomKey)
  if (!room) {
    room = { teamId, collaborators: new Map() }
    rooms.set(roomKey, room)
  } else if (!room.teamId && teamId) {
    room.teamId = teamId
  }
  return room
}

export function getActiveEditors(
  documentType: string,
  teamId: string
): Record<
  string,
  {
    userId: string
    fullName: string | null
    email: string
    avatarUrl: string | null
    color: string
  }[]
> {
  const result: Record<string, any[]> = {}
  for (const [roomKey, room] of rooms) {
    const [type, docId] = roomKey.split(':')
    if (type !== documentType) continue
    if (room.teamId && room.teamId !== teamId) continue
    const collabs = Array.from(room.collaborators.values())
    if (collabs.length === 0) continue
    result[docId] = collabs.map((c) => ({
      userId: c.userId,
      fullName: c.fullName,
      email: c.email,
      avatarUrl: c.avatarUrl,
      color: c.color,
    }))
  }
  return result
}

let io: SocketServer | null = null

export function getSocketServer(): SocketServer | null {
  return io
}

function resolveAllowedOrigins(): true | string[] {
  if (app.inDev) return true
  const raw = env.get('CORS_ORIGIN', '')
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const frontend = env.get('FRONTEND_URL', '')
  if (frontend && !origins.includes(frontend)) origins.push(frontend)
  return origins.length > 0 ? origins : true
}

export function initWebSocket(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: resolveAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/ws',
    transports: ['websocket', 'polling'],
  })

  const collabNs = io.of('/collaboration')

  collabNs.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string
      if (!token) {
        return next(new Error('Authentication required'))
      }

      const accessToken = await User.accessTokens.verify(new Secret(token))
      if (!accessToken) {
        return next(new Error('Invalid token'))
      }

      const user = await User.find(accessToken.tokenableId)
      if (!user) {
        return next(new Error('User not found'))
      }

      ;(socket as any).userId = user.id
      ;(socket as any).user = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: (user as any).avatarUrl ?? null,
        currentTeamId: user.currentTeamId,
      }

      next()
    } catch {
      next(new Error('Authentication failed'))
    }
  })

  const userSocketCount = new Map<string, number>()
  const MAX_SOCKETS_PER_USER = 5

  collabNs.on('connection', (socket: Socket) => {
    const userData = (socket as any).user
    const userId = (socket as any).userId as string

    const count = userSocketCount.get(userId) || 0
    if (count >= MAX_SOCKETS_PER_USER) {
      socket.emit('error', { message: 'Too many concurrent connections' })
      socket.disconnect(true)
      return
    }
    userSocketCount.set(userId, count + 1)
    socket.on('disconnect', () => {
      const c = userSocketCount.get(userId) || 1
      if (c <= 1) userSocketCount.delete(userId)
      else userSocketCount.set(userId, c - 1)
    })

    socket.on('join-document', async (data: { documentType: string; documentId: string }) => {
      const { documentType, documentId } = data

      const validTypes = ['invoice', 'quote', 'credit_note']
      if (!documentType || !validTypes.includes(documentType)) {
        socket.emit('error', { message: 'Invalid document type' })
        return
      }
      if (!documentId || typeof documentId !== 'string' || documentId.length > 100) {
        socket.emit('error', { message: 'Invalid document ID' })
        return
      }

      const roomKey = getRoomKey(documentType, documentId)

      let permission: SharePermission = 'viewer'
      let isOwner = false
      let documentTeamId: string | null = null

      const { default: DocumentAccessService } =
        await import('#services/collaboration/document_access_service')
      const { default: DocumentShare } = await import('#models/collaboration/document_share')
      const accessService = new DocumentAccessService()

      const document = userData.currentTeamId
        ? await accessService.getDocument(documentType as any, documentId, userData.currentTeamId)
        : null

      if (document) {
        permission = 'editor'
        isOwner = true
        documentTeamId = userData.currentTeamId
      } else {
        let share = await DocumentShare.query()
          .where('document_type', documentType)
          .where('document_id', documentId)
          .where('shared_with_user_id', userId)
          .where('status', 'active')
          .first()

        if (!share) {
          const pending = await DocumentShare.query()
            .where('document_type', documentType)
            .where('document_id', documentId)
            .where('status', 'pending')
            .whereRaw('LOWER(shared_with_email) = ?', [userData.email.toLowerCase()])
            .first()
          if (pending) {
            pending.sharedWithUserId = userId
            pending.status = 'active'
            await pending.save()
            share = pending
          }
        }

        if (!share) {
          socket.emit('access-denied', { message: 'You do not have access to this document' })
          return
        }
        permission = share.permission
        documentTeamId = share.teamId
      }

      socket.join(roomKey)

      const room = getOrCreateRoom(roomKey, documentTeamId)
      const existing = room.collaborators.get(userId)
      const color = existing?.color ?? colorForUser(userId)

      const collaboratorInfo: CollaboratorInfo & { socketId: string } = {
        userId,
        fullName: userData.fullName,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
        permission,
        isOwner,
        color,
        socketId: socket.id,
      }

      room.collaborators.set(userId, collaboratorInfo)
      ;(socket as any).currentRoom = roomKey

      const collaborators = Array.from(room.collaborators.values()).map(
        ({ socketId: _, ...c }) => c
      )
      socket.emit('room-joined', {
        permission,
        isOwner,
        color,
        collaborators,
      })

      socket.to(roomKey).emit('collaborator-joined', {
        userId,
        fullName: userData.fullName,
        email: userData.email,
        avatarUrl: userData.avatarUrl,
        permission,
        isOwner,
        color,
      })
    })

    socket.on('cursor-move', (data: { x: number; y: number; fieldId?: string }) => {
      const roomKey = (socket as any).currentRoom
      if (!roomKey) return
      if (typeof data?.x !== 'number' || typeof data?.y !== 'number') return
      if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return

      socket.to(roomKey).emit('cursor-moved', {
        userId,
        x: data.x,
        y: data.y,
        fieldId: typeof data.fieldId === 'string' ? data.fieldId.slice(0, 100) : undefined,
      })
    })

    socket.on('document-change', (data: { path: string; value: any }) => {
      const roomKey = (socket as any).currentRoom
      if (!roomKey) return
      if (typeof data?.path !== 'string' || data.path.length > 200) return

      const room = rooms.get(roomKey)
      const collaborator = room?.collaborators.get(userId)
      if (!collaborator || collaborator.permission !== 'editor') {
        socket.emit('error', { message: 'You do not have edit permission' })
        return
      }

      socket.to(roomKey).emit('document-changed', {
        userId,
        path: data.path,
        value: data.value,
        timestamp: Date.now(),
      })
    })

    socket.on('field-focus', (data: { fieldId: string }) => {
      const roomKey = (socket as any).currentRoom
      if (!roomKey) return
      if (typeof data?.fieldId !== 'string' || data.fieldId.length > 300) return

      socket.to(roomKey).emit('field-focused', {
        userId,
        fieldId: data.fieldId,
      })
    })

    socket.on('field-blur', (data: { fieldId: string }) => {
      const roomKey = (socket as any).currentRoom
      if (!roomKey) return
      if (typeof data?.fieldId !== 'string' || data.fieldId.length > 300) return

      socket.to(roomKey).emit('field-blurred', {
        userId,
        fieldId: data.fieldId,
      })
    })

    socket.on('leave-document', () => {
      handleLeaveRoom(socket, userId)
    })

    socket.on('disconnect', () => {
      handleLeaveRoom(socket, userId)
    })
  })

  console.log('[faktur] WebSocket server initialized on /ws')
  return io
}

async function handleLeaveRoom(socket: Socket, userId: string) {
  const roomKey = (socket as any).currentRoom
  if (!roomKey) return

  socket.leave(roomKey)
  ;(socket as any).currentRoom = null

  const room = rooms.get(roomKey)
  if (!room) return

  if (io) {
    const collabNs = io.of('/collaboration')
    const socketsInRoom = await collabNs.in(roomKey).fetchSockets()
    const userStillPresent = socketsInRoom.some(
      (s) => (s as any).userId === userId && s.id !== socket.id
    )

    if (!userStillPresent) {
      room.collaborators.delete(userId)
      socket.to(roomKey).emit('collaborator-left', { userId })

      const [docType, docId] = roomKey.split(':')
      if (docType && docId) {
        import('#models/collaboration/document_share_link').then(
          ({ default: DocumentShareLink }) => {
            DocumentShareLink.query()
              .where('document_type', docType)
              .where('document_id', docId)
              .where('created_by_user_id', userId)
              .where('auto_expire', true)
              .where('is_active', true)
              .update({ isActive: false })
              .catch(() => {})
          }
        )
      }

      if (room.collaborators.size === 0) {
        rooms.delete(roomKey)
      }
    }
  }
}

export async function updateCollaboratorPermission(
  documentType: string,
  documentId: string,
  userId: string,
  permission: SharePermission
) {
  if (!io) return

  const roomKey = getRoomKey(documentType, documentId)
  const room = rooms.get(roomKey)
  const collaborator = room?.collaborators.get(userId)
  if (collaborator) collaborator.permission = permission

  const collabNs = io.of('/collaboration')
  const sockets = await collabNs.in(roomKey).fetchSockets()
  for (const s of sockets) {
    if ((s as any).userId === userId) {
      s.emit('permission-changed', { permission })
    }
  }
}

export function broadcastDocumentDeleted(documentType: string, documentId: string) {
  if (!io) return

  const roomKey = getRoomKey(documentType, documentId)
  const collabNs = io.of('/collaboration')
  collabNs.to(roomKey).emit('document-deleted', {
    message: 'This document has been deleted',
  })

  rooms.delete(roomKey)
}

export function broadcastDocumentSaved(
  documentType: string,
  documentId: string,
  savedByUserId: string
) {
  if (!io) return

  const roomKey = getRoomKey(documentType, documentId)
  const collabNs = io.of('/collaboration')
  collabNs.to(roomKey).emit('document-saved', {
    savedByUserId,
    timestamp: Date.now(),
  })
}

export async function disconnectUserFromDocument(
  documentType: string,
  documentId: string,
  userId: string
) {
  if (!io) return

  const roomKey = getRoomKey(documentType, documentId)
  const room = rooms.get(roomKey)
  if (!room) return

  const collaborator = room.collaborators.get(userId)
  if (!collaborator) return

  const collabNs = io.of('/collaboration')
  const sockets = await collabNs.in(roomKey).fetchSockets()

  for (const s of sockets) {
    if ((s as any).userId === userId) {
      s.emit('access-revoked', {
        message: 'Your access to this document has been revoked',
      })
      s.leave(roomKey)
      ;(s as any).currentRoom = null
    }
  }

  room.collaborators.delete(userId)
  collabNs.to(roomKey).emit('collaborator-left', { userId })

  if (room.collaborators.size === 0) {
    rooms.delete(roomKey)
  }
}
