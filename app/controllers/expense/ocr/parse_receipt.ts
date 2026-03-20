import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import type { OcrProvider } from '#services/ocr/ocr_provider'
import MockOcrProvider from '#services/ocr/mock_ocr_provider'
import MindeeOcrProvider from '#services/ocr/mindee_ocr_provider'

function getOcrProvider(): OcrProvider {
  const provider = env.get('OCR_PROVIDER', 'mock')
  if (provider === 'mindee') {
    return new MindeeOcrProvider()
  }
  return new MockOcrProvider()
}

export default class ParseReceipt {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const file = request.file('receipt', {
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    })

    if (!file) {
      return response.badRequest({ message: 'No receipt file provided' })
    }

    if (!file.tmpPath) {
      return response.badRequest({ message: 'File upload failed' })
    }

    const { readFile } = await import('node:fs/promises')
    const fileBuffer = await readFile(file.tmpPath)
    const mimeType = file.headers?.['content-type'] || 'image/jpeg'

    try {
      const provider = getOcrProvider()
      const result = await provider.parseReceipt(fileBuffer, mimeType)

      return response.ok({
        message: 'Receipt parsed successfully',
        data: result,
      })
    } catch (error: any) {
      return response.internalServerError({
        message: 'OCR processing failed',
        error: error.message,
      })
    }
  }
}
