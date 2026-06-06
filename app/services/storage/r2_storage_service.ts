import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ALLOWED_CONTENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const MAX_KEY_LENGTH = 1024
const ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable'

function sanitizeContentType(contentType?: string): string {
  const base = (contentType || '').split(';')[0].trim().toLowerCase()
  return ALLOWED_CONTENT_TYPES.has(base) ? base : 'application/octet-stream'
}

function normalizeKey(rawKey: string): string | null {
  const key = rawKey.replace(/^\/+/, '')
  if (!key || key.length > MAX_KEY_LENGTH) return null
  if (key.includes('..') || key.includes('\\') || key.includes('\0')) return null
  return key
}

class R2StorageService {
  private client: S3Client | null = null
  private bucket: string | null = null
  private publicUrl: string | null = null

  private isConfigured(): boolean {
    const accountId = env.get('R2_ACCOUNT_ID')
    const accessKeyId = env.get('R2_ACCESS_KEY_ID')
    const secretAccessKey = env.get('R2_SECRET_ACCESS_KEY')
    const bucketName = env.get('R2_BUCKET_NAME')
    const publicUrl = env.get('R2_PUBLIC_URL')

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
      return false
    }

    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
      this.bucket = bucketName
      this.publicUrl = publicUrl.replace(/\/$/, '')
    }

    return true
  }

  async upload(
    folder: string,
    fileName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const key = normalizeKey(`${folder}/${fileName}`)
    if (!key) {
      throw new Error('Invalid storage key')
    }

    const safeContentType = sanitizeContentType(contentType)

    if (this.isConfigured()) {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket!,
          Key: key,
          Body: buffer,
          ContentType: safeContentType,
          ContentLength: buffer.length,
          CacheControl: ASSET_CACHE_CONTROL,
        })
      )
      return `${this.publicUrl}/${key}`
    }

    const uploadsDir = join(app.tmpPath(), 'uploads', folder)
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true })
    }
    writeFileSync(join(uploadsDir, fileName), buffer)
    return `/${folder}/${fileName}`
  }

  async delete(urlOrKey: string): Promise<void> {
    const key = this.keyFromUrl(urlOrKey)
    if (!key) return

    if (this.isConfigured()) {
      await this.client!.send(
        new DeleteObjectCommand({
          Bucket: this.bucket!,
          Key: key,
        })
      )
      return
    }

    const filePath = join(app.tmpPath(), 'uploads', key)
    if (existsSync(filePath)) {
      unlinkSync(filePath)
    }
  }

  async getObject(
    urlOrKey: string
  ): Promise<{ body: Buffer; contentType: string; size: number } | null> {
    const key = this.keyFromUrl(urlOrKey)
    if (!key) return null

    if (this.isConfigured()) {
      try {
        const result = await this.client!.send(
          new GetObjectCommand({ Bucket: this.bucket!, Key: key })
        )
        const bytes = await result.Body!.transformToByteArray()
        return {
          body: Buffer.from(bytes),
          contentType: result.ContentType || 'application/octet-stream',
          size: Number(result.ContentLength ?? bytes.length),
        }
      } catch {
        return null
      }
    }

    const filePath = join(app.tmpPath(), 'uploads', key)
    if (!existsSync(filePath)) return null
    const body = readFileSync(filePath)
    return { body, contentType: 'application/octet-stream', size: body.length }
  }

  async listObjects(
    prefix: string
  ): Promise<{ key: string; size: number; contentType?: string }[]> {
    if (!this.isConfigured()) {
      return []
    }

    const objects: { key: string; size: number; contentType?: string }[] = []
    let continuationToken: string | undefined

    do {
      const result = await this.client!.send(
        new ListObjectsV2Command({
          Bucket: this.bucket!,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      )

      for (const item of result.Contents ?? []) {
        if (!item.Key) continue
        objects.push({ key: item.Key, size: Number(item.Size ?? 0) })
      }

      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined
    } while (continuationToken)

    return objects
  }

  async headObject(urlOrKey: string): Promise<{ size: number; contentType?: string } | null> {
    if (!this.isConfigured()) {
      return null
    }

    const key = this.keyFromUrl(urlOrKey)
    if (!key) return null

    try {
      const result = await this.client!.send(
        new HeadObjectCommand({ Bucket: this.bucket!, Key: key })
      )
      return { size: Number(result.ContentLength ?? 0), contentType: result.ContentType }
    } catch {
      return null
    }
  }

  keyFromUrl(urlOrKey: string): string | null {
    if (!urlOrKey) return null
    let raw: string
    if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
      try {
        raw = decodeURIComponent(new URL(urlOrKey).pathname)
      } catch {
        return null
      }
    } else {
      raw = urlOrKey
    }
    return normalizeKey(raw)
  }

  getPublicUrl(key: string): string {
    if (this.isConfigured()) {
      return `${this.publicUrl}/${key}`
    }
    return `/${key}`
  }
}

export default new R2StorageService()
