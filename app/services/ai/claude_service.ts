import env from '#start/env'
import InvoiceSetting from '#models/team/invoice_setting'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>
}

export default class ClaudeService {
  /**
   * Resolve the API key to use: custom team key (decrypted) or default env key.
   */
  private async getApiKey(teamId: string, dek: Buffer): Promise<string | null> {
    const settings = await InvoiceSetting.findBy('teamId', teamId)

    if (settings?.aiCustomApiKey) {
      try {
        return zeroAccessCryptoService.decryptField(settings.aiCustomApiKey, dek)
      } catch {
        // Decryption failed, fall through to default key
      }
    }

    return env.get('ANTHROPIC_API_KEY', '')
  }

  /**
   * Resolve the model to use from team settings.
   */
  private async getModel(teamId: string): Promise<string> {
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    return settings?.aiModel || 'claude-sonnet-4-5-20250929'
  }

  /**
   * Check if AI is enabled for the team.
   */
  async isEnabled(teamId: string): Promise<boolean> {
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    return settings?.aiEnabled ?? false
  }

  /**
   * Call Claude API with a system prompt and messages.
   */
  async chat(
    teamId: string,
    dek: Buffer,
    systemPrompt: string,
    messages: ClaudeMessage[],
    maxTokens: number = 1024
  ): Promise<string> {
    const apiKey = await this.getApiKey(teamId, dek)
    if (!apiKey) {
      throw new Error('No API key configured. Set ANTHROPIC_API_KEY or add a custom key in settings.')
    }

    const model = await this.getModel(teamId)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Claude API error ${res.status}: ${errorText}`)
    }

    const data = (await res.json()) as ClaudeResponse
    return data.content?.[0]?.text || ''
  }

  /**
   * Simple single-prompt generation.
   */
  async generate(
    teamId: string,
    dek: Buffer,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1024
  ): Promise<string> {
    return this.chat(teamId, dek, systemPrompt, [{ role: 'user', content: userPrompt }], maxTokens)
  }
}
