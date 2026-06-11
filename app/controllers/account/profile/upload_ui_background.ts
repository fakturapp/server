import type { HttpContext } from '@adonisjs/core/http'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import Team from '#models/team/team'
import r2StorageService from '#services/storage/r2_storage_service'
import storageService from '#services/storage/storage_service'
import uiBackgroundService from '#services/storage/ui_background_service'
import { parseStoredUiTheme, serializeUiTheme } from '#services/account/ui_theme'

export default class UploadUiBackground {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.badRequest({ message: 'Aucune équipe sélectionnée' })
    }

    const team = await Team.find(user.currentTeamId)
    if (!team) {
      return response.notFound({ message: 'Équipe introuvable' })
    }

    const file = request.file('background', {
      size: '8mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (!file) {
      return response.badRequest({ message: 'Aucun fichier fourni' })
    }

    if (!file.isValid) {
      return response.badRequest({ message: file.errors[0]?.message || 'Fichier invalide' })
    }

    if (!file.tmpPath) {
      return response.badRequest({ message: 'Fichier temporaire introuvable' })
    }

    const buffer = await readFile(file.tmpPath)

    const usage = await storageService.usage(team.id, team.plan)
    if (usage.totalBytes + buffer.length > usage.quotaBytes) {
      return response.unprocessableEntity({
        message:
          "Espace de stockage insuffisant : libérez de l'espace ou choisissez une image plus légère.",
      })
    }

    const theme = parseStoredUiTheme(user.uiTheme)
    const previousUrl = theme.customBackgroundUrl

    const folder = `ui-backgrounds/${user.id}`
    const fileName = `${randomUUID()}.${file.extname}`
    const contentType = file.headers?.['content-type'] || 'image/png'

    const backgroundUrl = await r2StorageService.upload(folder, fileName, buffer, contentType)

    await storageService.recordUpload(
      team.id,
      'ui_background',
      `${folder}/${fileName}`,
      backgroundUrl,
      buffer.length,
      contentType,
      file.clientName ?? null,
      user.id
    )

    if (previousUrl && previousUrl !== backgroundUrl) {
      await uiBackgroundService.purge(previousUrl, user.id)
    }

    theme.customBackgroundUrl = backgroundUrl
    theme.background = 'custom'
    const serialized = serializeUiTheme(theme)
    user.uiTheme = serialized
    await user.save()

    return response.ok({
      message: 'Fond personnalisé enregistré',
      backgroundUrl,
      uiTheme: serialized,
    })
  }
}
