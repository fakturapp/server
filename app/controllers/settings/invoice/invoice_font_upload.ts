import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import InvoiceSetting from '#models/team/invoice_setting'
import { buildDefaultInvoiceSettings } from '#services/settings/default_invoice_settings'
import r2StorageService from '#services/storage/r2_storage_service'
import storageService from '#services/storage/storage_service'

function familyFromFilename(name: string | null): string {
  const base = (name || 'Police personnalisée').replace(/\.[a-z0-9]+$/i, '').trim()
  return base.slice(0, 60) || 'Police personnalisée'
}

export default class InvoiceFontUpload {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!

    if (!user.currentTeamId) {
      return response.notFound({ message: 'Aucune équipe sélectionnée' })
    }

    const file = request.file('font', {
      size: '5mb',
      extnames: ['ttf', 'otf', 'woff', 'woff2'],
    })

    if (!file) {
      return response.badRequest({ message: 'Aucun fichier fourni' })
    }

    if (!file.isValid) {
      return response.badRequest({ message: file.errors[0]?.message || 'Police invalide' })
    }

    if (!file.tmpPath) {
      return response.badRequest({ message: 'Fichier temporaire introuvable' })
    }

    let buffer: Buffer
    try {
      buffer = await readFile(file.tmpPath)
    } catch (error) {
      logger.error({ err: error, userId: user.id, tmpPath: file.tmpPath }, 'invoice font tmp read failed')
      return response.internalServerError({ message: 'Lecture du fichier impossible, réessayez.' })
    }

    const teamId = user.currentTeamId
    const folder = `invoice-fonts/${teamId}`
    const fileName = `${randomUUID()}.${file.extname}`
    const objectKey = `${folder}/${fileName}`
    const contentType = file.headers?.['content-type'] || 'font/ttf'

    let fontUrl: string
    try {
      fontUrl = await r2StorageService.upload(folder, fileName, buffer, contentType)
    } catch (error) {
      logger.error({ err: error, userId: user.id, teamId, objectKey }, 'invoice font r2 upload failed')
      return response.internalServerError({ message: "L'envoi de la police a échoué, réessayez." })
    }

    try {
      await storageService.recordUpload(
        teamId,
        'invoice_font',
        objectKey,
        fontUrl,
        buffer.length,
        contentType,
        file.clientName ?? null,
        user.id
      )
    } catch (error) {
      logger.error({ err: error, userId: user.id, teamId, objectKey }, 'invoice font storage record failed')
      try {
        await r2StorageService.delete(fontUrl)
      } catch {}
      return response.internalServerError({ message: "L'enregistrement de la police a échoué, réessayez." })
    }

    const fontName = familyFromFilename(file.clientName ?? null)

    let settings = await InvoiceSetting.findBy('teamId', teamId)
    if (!settings) {
      settings = await InvoiceSetting.create({
        ...buildDefaultInvoiceSettings(teamId),
        customFontUrl: fontUrl,
        customFontName: fontName,
        documentFont: fontName,
      })
    } else {
      const previousUrl = settings.customFontUrl
      settings.customFontUrl = fontUrl
      settings.customFontName = fontName
      settings.documentFont = fontName
      await settings.save()
      if (previousUrl && previousUrl !== fontUrl) {
        try {
          await r2StorageService.delete(previousUrl)
        } catch {}
      }
    }

    return response.ok({
      message: 'Police personnalisée enregistrée',
      customFontUrl: fontUrl,
      customFontName: fontName,
    })
  }
}
