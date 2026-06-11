import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
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

    let buffer: Buffer
    try {
      buffer = await readFile(file.tmpPath)
    } catch (error) {
      logger.error(
        { err: error, userId: user.id, tmpPath: file.tmpPath },
        'ui background tmp file read failed'
      )
      return response.internalServerError({ message: "Lecture du fichier impossible, réessayez." })
    }

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

    const objectKey = `${folder}/${fileName}`

    let backgroundUrl: string
    try {
      backgroundUrl = await r2StorageService.upload(folder, fileName, buffer, contentType)
    } catch (error) {
      logger.error(
        { err: error, userId: user.id, teamId: team.id, objectKey, contentType },
        'ui background r2 upload failed'
      )
      return response.internalServerError({
        message: "L'envoi de l'image a échoué, réessayez dans un instant.",
      })
    }

    try {
      await storageService.recordUpload(
        team.id,
        'ui_background',
        objectKey,
        backgroundUrl,
        buffer.length,
        contentType,
        file.clientName ?? null,
        user.id
      )
    } catch (error) {
      logger.error(
        { err: error, userId: user.id, teamId: team.id, objectKey },
        'ui background storage record failed'
      )
      try {
        await r2StorageService.delete(backgroundUrl)
      } catch (cleanupError) {
        logger.error(
          { err: cleanupError, userId: user.id, objectKey },
          'ui background r2 cleanup failed'
        )
      }
      return response.internalServerError({
        message: "L'enregistrement de l'image a échoué, réessayez dans un instant.",
      })
    }

    if (previousUrl && previousUrl !== backgroundUrl) {
      try {
        await uiBackgroundService.purge(previousUrl, user.id)
      } catch (error) {
        logger.error(
          { err: error, userId: user.id, previousUrl },
          'ui background previous purge failed'
        )
      }
    }

    theme.customBackgroundUrl = backgroundUrl
    theme.background = 'custom'
    const serialized = serializeUiTheme(theme)
    user.uiTheme = serialized

    try {
      await user.save()
    } catch (error) {
      logger.error(
        { err: error, userId: user.id, teamId: team.id },
        'ui background theme save failed'
      )
      return response.internalServerError({
        message: "L'application du fond a échoué, réessayez dans un instant.",
      })
    }

    return response.ok({
      message: 'Fond personnalisé enregistré',
      backgroundUrl,
      uiTheme: serialized,
    })
  }
}
