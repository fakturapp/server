import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice/invoice'
import StorageFile from '#models/storage/storage_file'

export default class IndexAttachments {
  async handle({ auth, params, response }: HttpContext) {
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

    const files = await StorageFile.query()
      .where('teamId', teamId)
      .where('category', 'invoice_attachment')
      .where('referenceId', invoice.id)
      .orderBy('created_at', 'desc')

    return response.ok({
      attachments: files.map((f) => ({
        id: f.id,
        fileName: f.originalName,
        contentType: f.contentType,
        sizeBytes: Number(f.sizeBytes),
        createdAt: f.createdAt?.toISO() ?? null,
      })),
    })
  }
}
