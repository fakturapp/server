import StorageFile from '#models/storage/storage_file'
import r2StorageService from '#services/storage/r2_storage_service'

class InvoiceBackgroundService {
  async purge(teamId: string, url: string): Promise<void> {
    try {
      await r2StorageService.delete(url)
    } catch {}

    const objectKey = r2StorageService.keyFromUrl(url)
    const query = StorageFile.query()
      .where('teamId', teamId)
      .where('category', 'invoice_background')
    if (objectKey) query.where('objectKey', objectKey)
    else query.where('publicUrl', url)

    await query.delete()
  }
}

export default new InvoiceBackgroundService()
