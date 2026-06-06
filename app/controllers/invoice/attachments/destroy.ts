import type { HttpContext } from '@adonisjs/core/http'
import StorageFile from '#models/storage/storage_file'
import storageService from '#services/storage/storage_service'

export default class DestroyAttachment {
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

    await storageService.deleteFile(teamId, file.id)

    return response.ok({ message: 'Pièce jointe supprimée' })
  }
}
