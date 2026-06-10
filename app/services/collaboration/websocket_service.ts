import { Server as SocketServer, type Socket } from 'socket.io'
import type { Server as HttpServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { Secret } from '@adonisjs/core/helpers'
import { CookieParser } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import encryption from '@adonisjs/core/services/encryption'
import env from '#start/env'
import User from '#models/account/user'
import type { SharePermission } from '#models/collaboration/document_share'

const AUTH_COOKIE_NAME = '__Secure-faktur_token'

function extractHandshakeToken(socket: Socket): string | null {
  const authToken = socket.handshake.auth?.token
  if (typeof authToken === 'string' && authToken.length > 0) return authToken

  const cookieHeader = socket.handshake.headers.cookie
  if (!cookieHeader) return null
  try {
    const parser = new CookieParser(cookieHeader, encryption.use())
    const value = parser.unsign(AUTH_COOKIE_NAME)
    return typeof value === 'string' && value.length > 0 ? value : null
  } catch {
    return null
  }
}

export type CollabRole = 'owner' | 'admin' | 'member' | 'viewer' | 'guest'

export interface CollaboratorInfo {
  userId: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  permission: SharePermission
  isOwner: boolean
  role: CollabRole
  color: string
}

export interface CursorPosition {
  userId: string
  anchor: string
  x: number
  y: number
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
  banned: Set<string>
}

const rooms = new Map<string, RoomPresence>()

function getRoomKey(documentType: string, documentId: string): string {
  return `${documentType}:${documentId}`
}

function getOrCreateRoom(roomKey: string, teamId: string | null): RoomPresence {
  let room = rooms.get(roomKey)
  if (!room) {
    room = { teamId, collaborators: new Map(), banned: new Set() }
    rooms.set(roomKey, room)
  } else if (!room.teamId && teamId) {
    room.teamId = teamId
  }
  return room
}

export function clearRoomBan(documentType: string, documentId: string, userId: string) {
  rooms.get(getRoomKey(documentType, documentId))?.banned.delete(userId)
}

function canModerate(requester: CollaboratorInfo | undefined): requester is CollaboratorInfo {
  return !!requester && (requester.role === 'owner' || requester.role === 'admin')
}

function joinRoom(
  socket: Socket,
  roomKey: string,
  userId: string,
  userData: any,
  permission: SharePermission,
  isOwner: boolean,
  role: CollabRole,
  documentTeamId: string | null
) {
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
    role,
    color,
    socketId: socket.id,
  }

  room.collaborators.set(userId, collaboratorInfo)
  ;(socket as any).currentRoom = roomKey

  const collaborators = Array.from(room.collaborators.values()).map(({ socketId: _, ...c }) => c)
  socket.emit('room-joined', {
    userId,
    permission,
    isOwner,
    role,
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
    role,
    color,
  })
}

async function moderateCollaborator(
  socket: Socket,
  requesterId: string,
  targetUserId: unknown,
  ban: boolean
) {
  const roomKey = (socket as any).currentRoom
  if (!roomKey || !io) return
  if (typeof targetUserId !== 'string' || !targetUserId || targetUserId === requesterId) return

  const room = rooms.get(roomKey)
  if (!room) return

  const requester = room.collaborators.get(requesterId)
  if (!canModerate(requester)) {
    socket.emit('error', { message: 'Seul le propriétaire ou un admin peut faire cela' })
    return
  }

  const target = room.collaborators.get(targetUserId)
  if (!target) return

  if (target.role === 'owner') {
    socket.emit('error', { message: 'Le propriétaire ne peut pas être expulsé' })
    return
  }

  if (target.role === 'admin' && requester.role !== 'owner') {
    socket.emit('error', { message: 'Seul le propriétaire peut expulser un admin' })
    return
  }

  if (ban && target.role !== 'guest') {
    socket.emit('error', { message: "Impossible de bannir un membre de l'équipe" })
    return
  }

  const [docType, docId] = roomKey.split(':')

  if (ban) {
    room.banned.add(targetUserId)
    const { default: DocumentShare } = await import('#models/collaboration/document_share')
    await DocumentShare.query()
      .where('document_type', docType)
      .where('document_id', docId)
      .where('shared_with_user_id', targetUserId)
      .whereNot('status', 'revoked')
      .update({ status: 'revoked' })
  }

  const collabNs = io.of('/collaboration')
  const sockets = await collabNs.in(roomKey).fetchSockets()
  for (const s of sockets) {
    if ((s as any).userId === targetUserId) {
      s.emit('kicked', { banned: ban })
      s.leave(roomKey)
      ;(s as any).currentRoom = null
    }
  }

  room.collaborators.delete(targetUserId)
  collabNs.to(roomKey).emit('collaborator-left', { userId: targetUserId })
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
      const guestToken = socket.handshake.auth?.guestToken
      if (typeof guestToken === 'string' && guestToken.length > 0 && guestToken.length <= 128) {
        const { default: DocumentShareLink } = await import(
          '#models/collaboration/document_share_link'
        )
        const { default: Team } = await import('#models/team/team')
        const { collaborationEnabled } = await import('#services/billing/plan_entitlements')

        const link = await DocumentShareLink.query()
          .where('token', guestToken)
          .where('is_active', true)
          .first()
        if (!link || link.isExpired || !link.allowAnonymous || link.visibility !== 'anyone') {
          return next(new Error('Invalid guest link'))
        }
        const team = await Team.find(link.teamId)
        if (!team || !collaborationEnabled(team)) {
          return next(new Error('Invalid guest link'))
        }

        const guestId = `guest:${randomUUID().slice(0, 8)}`
        ;(socket as any).userId = guestId
        ;(socket as any).user = {
          id: guestId,
          fullName: 'Invité',
          email: `${guestId.replace(':', '-')}@faktur.guest`,
          avatarUrl: null,
          currentTeamId: null,
        }
        ;(socket as any).guestRoom = getRoomKey(link.documentType, link.documentId)
        return next()
      }

      const token = extractHandshakeToken(socket)
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

      if (rooms.get(roomKey)?.banned.has(userId)) {
        socket.emit('access-denied', { message: 'Votre accès à ce document a été révoqué' })
        return
      }

      let permission: SharePermission = 'viewer'
      let isOwner = false
      let role: CollabRole = 'guest'
      let documentTeamId: string | null = null

      const guestRoom = (socket as any).guestRoom as string | undefined
      if (guestRoom) {
        if (guestRoom !== roomKey) {
          socket.emit('access-denied', { message: 'You do not have access to this document' })
          return
        }
        joinRoom(socket, roomKey, userId, userData, 'viewer', false, 'guest', null)
        return
      }

      const { default: DocumentAccessService } =
        await import('#services/collaboration/document_access_service')
      const { default: DocumentShare } = await import('#models/collaboration/document_share')
      const accessService = new DocumentAccessService()

      const document = userData.currentTeamId
        ? await accessService.getDocument(documentType as any, documentId, userData.currentTeamId)
        : null

      if (document) {
        documentTeamId = userData.currentTeamId
        const { default: Team } = await import('#models/team/team')
        const { default: TeamMember } = await import('#models/team/team_member')
        const [team, membership] = await Promise.all([
          Team.find(documentTeamId),
          TeamMember.query()
            .where('team_id', documentTeamId!)
            .where('user_id', userId)
            .where('status', 'active')
            .first(),
        ])

        if (team && team.ownerId === userId) {
          role = 'owner'
        } else if (membership?.role === 'super_admin' || membership?.role === 'admin') {
          role = 'admin'
        } else if (membership?.role === 'viewer') {
          role = 'viewer'
        } else {
          role = 'member'
        }

        permission = role === 'viewer' ? 'viewer' : 'editor'
        isOwner = role === 'owner'
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
        role = 'guest'
      }

      joinRoom(socket, roomKey, userId, userData, permission, isOwner, role, documentTeamId)
    })

    socket.on('cursor-move', (data: { anchor?: string; fieldId?: string; x: number; y: number }) => {
      const roomKey = (socket as any).currentRoom
      if (!roomKey) return
      if (typeof data?.x !== 'number' || typeof data?.y !== 'number') return
      if (!Number.isFinite(data.x) || !Number.isFinite(data.y)) return

      const anchor =
        typeof data?.anchor === 'string'
          ? data.anchor
          : typeof data?.fieldId === 'string'
            ? data.fieldId
            : ''
      if (anchor.length > 300) return

      socket.to(roomKey).emit('cursor-moved', {
        userId,
        anchor,
        x: data.x,
        y: data.y,
        fieldId: anchor.slice(0, 100) || undefined,
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

    socket.on('field-selection', (data: { fieldId: string; text: string }) => {
      const roomKey = (socket as any).currentRoom
      if (!roomKey) return
      if (typeof data?.fieldId !== 'string' || data.fieldId.length > 300) return
      if (typeof data?.text !== 'string' || data.text.length > 200) return

      const room = rooms.get(roomKey)
      const collaborator = room?.collaborators.get(userId)
      if (!collaborator || collaborator.permission !== 'editor') return

      socket.to(roomKey).emit('field-selection-changed', {
        userId,
        fieldId: data.fieldId,
        text: data.text,
      })
    })

    socket.on('ping-check', (cb: unknown) => {
      if (typeof cb === 'function') cb()
    })

    socket.on('latency-report', (data: { ms: number }) => {
      const roomKey = (socket as any).currentRoom
      if (!roomKey) return
      const ms = Number(data?.ms)
      if (!Number.isFinite(ms) || ms < 0 || ms > 60000) return
      const room = rooms.get(roomKey)
      if (!room?.collaborators.has(userId)) return

      collabNs.to(roomKey).emit('collaborator-latency', {
        userId,
        latencyMs: Math.round(ms),
      })
    })

    socket.on('kick-user', async (data: { userId: string }) => {
      await moderateCollaborator(socket, userId, data?.userId, false)
    })

    socket.on('ban-user', async (data: { userId: string }) => {
      await moderateCollaborator(socket, userId, data?.userId, true)
    })

    socket.on(
      'change-permission',
      async (data: { userId: string; permission: SharePermission }) => {
        const roomKey = (socket as any).currentRoom
        if (!roomKey) return
        const targetUserId = data?.userId
        const permission = data?.permission
        if (typeof targetUserId !== 'string' || !targetUserId) return
        if (permission !== 'viewer' && permission !== 'editor') return

        const room = rooms.get(roomKey)
        if (!room) return

        const requester = room.collaborators.get(userId)
        if (!canModerate(requester)) {
          socket.emit('error', { message: 'Seul le propriétaire ou un admin peut faire cela' })
          return
        }

        const target = room.collaborators.get(targetUserId)
        if (!target || target.role !== 'guest') return

        const [docType, docId] = roomKey.split(':')
        const { default: DocumentShare } = await import('#models/collaboration/document_share')
        await DocumentShare.query()
          .where('document_type', docType)
          .where('document_id', docId)
          .where('shared_with_user_id', targetUserId)
          .where('status', 'active')
          .update({ permission })

        await updateCollaboratorPermission(docType, docId, targetUserId, permission)
      }
    )

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

  if (collaborator) {
    collabNs.to(roomKey).emit('collaborator-updated', { userId, permission })
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
