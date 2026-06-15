import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import Invoice from '#models/invoice/invoice'
import StorageFile from '#models/storage/storage_file'
import r2StorageService from '#services/storage/r2_storage_service'
import storageService from '#services/storage/storage_service'

const MAX_ATTACHMENTS_PER_INVOICE = 20

export default class UploadAttachment {
  async handle({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const invoice = await Invoice.query()
      .where('id', params.invoiceId)
      .where('team_id', teamId)
      .first()

    if (!invoice) {
      return response.notFound({ message: 'Invoice not found' })
    }

    const count = await StorageFile.query()
      .where('teamId', teamId)
      .where('category', 'invoice_attachment')
      .where('referenceId', invoice.id)
      .count('* as total')
      .first()
    if (Number(count?.$extras.total ?? 0) >= MAX_ATTACHMENTS_PER_INVOICE) {
      return response.badRequest({
        message: `Cette facture a atteint la limite de ${MAX_ATTACHMENTS_PER_INVOICE} pièces jointes.`,
      })
    }

    const file = request.file('file', {
      size: '10mb',
      extnames: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'],
    })
    if (!file) {
      return response.badRequest({ message: 'Aucun fichier fourni' })
    }
    if (!file.isValid) {
      return response.unprocessableEntity({
        message: file.errors[0]?.message || 'Fichier invalide',
      })
    }
    if (!file.tmpPath) {
      return response.badRequest({ message: 'Fichier temporaire introuvable' })
    }

    const ext = file.extname ? `.${file.extname}` : ''
    const fileName = `${teamId}-${randomUUID()}${ext}`
    const buffer = await readFile(file.tmpPath)
    const contentType = file.headers?.['content-type'] || 'application/octet-stream'

    const publicUrl = await r2StorageService.upload(
      'invoice-attachments',
      fileName,
      buffer,
      contentType
    )

    const record = await storageService.recordUpload(
      teamId,
      'invoice_attachment',
      `invoice-attachments/${fileName}`,
      publicUrl,
      buffer.length,
      contentType,
      file.clientName ?? null,
      invoice.id
    )

    return response.created({
      attachment: {
        id: record.id,
        fileName: record.originalName,
        contentType: record.contentType,
        sizeBytes: Number(record.sizeBytes),
        createdAt: record.createdAt?.toISO() ?? null,
      },
    })
  }
}
