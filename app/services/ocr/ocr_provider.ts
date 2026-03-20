export interface OcrReceiptResult {
  supplier: string | null
  description: string | null
  amount: number | null
  vatAmount: number | null
  vatRate: number | null
  currency: string | null
  date: string | null
  paymentMethod: string | null
  confidence: number
}

export interface OcrProvider {
  parseReceipt(fileBuffer: Buffer, mimeType: string): Promise<OcrReceiptResult>
}
