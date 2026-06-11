import StorageFile from '#models/storage/storage_file'
import r2StorageService from '#services/storage/r2_storage_service'

class UiBackgroundService {
  async purge(url: string, userId: string): Promise<void> {
    try {
      await r2StorageService.delete(url)
    } catch {}

    const objectKey = r2StorageService.keyFromUrl(url)
    if (!objectKey) return

    await StorageFile.query()
      .where('objectKey', objectKey)
      .where('category', 'ui_background')
      .where('referenceId', userId)
      .delete()
  }
}

export default new UiBackgroundService()
