import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import InvoiceSetting from '#models/team/invoice_setting'
import { buildDefaultInvoiceSettings } from '#services/settings/default_invoice_settings'
import r2StorageService from '#services/storage/r2_storage_service'
import storageService from '#services/storage/storage_service'
import invoiceBackgroundService from '#services/storage/invoice_background_service'

export default class InvoiceBackgroundUpload {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.notFound({ message: 'Aucune équipe sélectionnée' })
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
        'invoice background tmp file read failed'
      )
      return response.internalServerError({ message: 'Lecture du fichier impossible, réessayez.' })
    }

    const teamId = user.currentTeamId
    const folder = `invoice-backgrounds/${teamId}`
    const fileName = `${randomUUID()}.${file.extname}`
    const objectKey = `${folder}/${fileName}`
    const contentType = file.headers?.['content-type'] || 'image/png'

    let backgroundUrl: string
    try {
      backgroundUrl = await r2StorageService.upload(folder, fileName, buffer, contentType)
    } catch (error) {
      logger.error(
        { err: error, userId: user.id, teamId, objectKey, contentType },
        'invoice background r2 upload failed'
      )
      return response.internalServerError({
        message: "L'envoi de l'image a échoué, réessayez dans un instant.",
      })
    }

    try {
      await storageService.recordUpload(
        teamId,
        'invoice_background',
        objectKey,
        backgroundUrl,
        buffer.length,
        contentType,
        file.clientName ?? null,
        user.id
      )
    } catch (error) {
      logger.error(
        { err: error, userId: user.id, teamId, objectKey },
        'invoice background storage record failed'
      )
      try {
        await r2StorageService.delete(backgroundUrl)
      } catch {}
      return response.internalServerError({
        message: "L'enregistrement de l'image a échoué, réessayez dans un instant.",
      })
    }

    let settings = await InvoiceSetting.findBy('teamId', teamId)
    const previousUrl = settings?.customBackgroundUrl ?? null

    if (!settings) {
      settings = await InvoiceSetting.create({
        ...buildDefaultInvoiceSettings(teamId),
        customBackgroundUrl: backgroundUrl,
      })
    } else {
      settings.customBackgroundUrl = backgroundUrl
      await settings.save()
    }

    if (previousUrl && previousUrl !== backgroundUrl) {
      try {
        await invoiceBackgroundService.purge(teamId, previousUrl)
      } catch (error) {
        logger.error(
          { err: error, userId: user.id, teamId, previousUrl },
          'invoice background previous purge failed'
        )
      }
    }

    return response.ok({
      message: 'Fond personnalisé enregistré',
      customBackgroundUrl: backgroundUrl,
    })
  }
}
