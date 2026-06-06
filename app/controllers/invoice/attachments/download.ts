import type { HttpContext } from '@adonisjs/core/http'
import StorageFile from '#models/storage/storage_file'
import r2StorageService from '#services/storage/r2_storage_service'

export default class DownloadAttachment {
  async handle({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const file = await StorageFile.query()
      .where('id', params.attachmentId)
      .where('teamId', teamId)
      .where('category', 'invoice_attachment')
      .where('referenceId', params.invoiceId)
      .first()

    if (!file) {
      return response.notFound({ message: 'Attachment not found' })
    }

    const object = await r2StorageService.getObject(file.objectKey)
    if (!object) {
      return response.notFound({ message: 'File not found' })
    }

    const name = file.originalName || 'fichier'
    const asciiName = name.replace(/[\r\n"]/g, '').replace(/[^\x20-\x7e]/g, '_')

    response.header('Content-Type', file.contentType || object.contentType)
    response.header(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`
    )
    response.header('Content-Length', String(object.size))
    return response.send(object.body)
  }
}
