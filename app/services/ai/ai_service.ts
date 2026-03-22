import env from '#start/env'
import InvoiceSetting from '#models/team/invoice_setting'
import zeroAccessCryptoService from '#services/crypto/zero_access_crypto_service'

type AiProvider = 'claude' | 'gemini' | 'groq'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Default models per provider
const DEFAULT_MODELS: Record<AiProvider, string> = {
  claude: 'claude-sonnet-4-5-20250929',
  gemini: 'gemini-2.5-flash-lite',
  groq: 'llama-3.3-70b-versatile',
}

// Default env key names
const ENV_KEYS: Record<AiProvider, string> = {
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  groq: 'GROQ_API_KEY',
}

// Provider-specific key column names
const PROVIDER_KEY_FIELDS: Record<
  AiProvider,
  'aiApiKeyClaude' | 'aiApiKeyGemini' | 'aiApiKeyGroq'
> = {
  claude: 'aiApiKeyClaude',
  gemini: 'aiApiKeyGemini',
  groq: 'aiApiKeyGroq',
}

export default class AiService {
  /**
   * Check if AI is enabled for the team.
   */
  static async isEnabled(teamId: string): Promise<boolean> {
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    return settings?.aiEnabled ?? false
  }

  /**
   * Resolve the provider for the team (or use override).
   */
  private static async getProvider(teamId: string, overrideProvider?: string): Promise<AiProvider> {
    if (overrideProvider && ['claude', 'gemini', 'groq'].includes(overrideProvider)) {
      return overrideProvider as AiProvider
    }
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    return (settings?.aiProvider as AiProvider) || 'gemini'
  }

  /**
   * Resolve the API key based on source mode.
   * - 'faktur' (server): ONLY use env var, never custom keys
   * - 'apikey' (custom): ONLY use user's custom key, never env var
   * - undefined: use team's aiKeyMode setting (legacy behavior)
   */
  private static async getApiKey(
    teamId: string,
    dek: Buffer,
    provider: AiProvider,
    sourceOverride?: 'faktur' | 'apikey'
  ): Promise<{ key: string | null; source: 'custom' | 'server' }> {
    const settings = await InvoiceSetting.findBy('teamId', teamId)

    // Determine effective mode: per-request override > team setting
    const effectiveMode =
      sourceOverride === 'faktur'
        ? 'server'
        : sourceOverride === 'apikey'
          ? 'custom'
          : (settings?.aiKeyMode as 'server' | 'custom') || 'server'

    // Server mode: ONLY env var, skip custom keys entirely
    if (effectiveMode === 'server') {
      return { key: env.get(ENV_KEYS[provider] as any, '') || null, source: 'server' }
    }

    // Custom mode: ONLY user keys, never fall back to env
    // 1. Try per-provider key
    const providerKeyField = PROVIDER_KEY_FIELDS[provider]
    const providerKey = settings?.[providerKeyField]
    if (providerKey) {
      try {
        return { key: zeroAccessCryptoService.decryptField(providerKey, dek), source: 'custom' }
      } catch {
        // Decryption failed, fall through
      }
    }

    // 2. Fallback: legacy aiCustomApiKey (only if provider matches settings.aiProvider)
    if (settings?.aiCustomApiKey && (settings?.aiProvider as AiProvider) === provider) {
      try {
        return {
          key: zeroAccessCryptoService.decryptField(settings.aiCustomApiKey, dek),
          source: 'custom',
        }
      } catch {
        // Decryption failed, fall through
      }
    }

    // No custom key found — do NOT fall back to server env
    return { key: null, source: 'custom' }
  }

  /**
   * Check which providers are available for the team.
   */
  static async getAvailableProviders(
    teamId: string,
    dek: Buffer
  ): Promise<Array<{ provider: AiProvider; available: boolean; source: 'custom' | 'server' }>> {
    const providers: AiProvider[] = ['gemini', 'groq', 'claude']
    const results = []
    for (const provider of providers) {
      const { key, source } = await AiService.getApiKey(teamId, dek, provider)
      results.push({ provider, available: !!key, source })
    }
    return results
  }

  /**
   * Resolve the model from team settings (or use override).
   */
  private static async getModel(
    teamId: string,
    provider: AiProvider,
    overrideModel?: string
  ): Promise<string> {
    if (overrideModel) return overrideModel
    const settings = await InvoiceSetting.findBy('teamId', teamId)
    // Only use saved model if provider matches
    if ((settings?.aiProvider as AiProvider) === provider && settings?.aiModel) {
      return settings.aiModel
    }
    return DEFAULT_MODELS[provider]
  }

  /**
   * Simple single-prompt generation (delegates to the right provider).
   * sourceOverride: 'faktur' = server key only, 'apikey' = custom key only
   */
  static async generate(
    teamId: string,
    dek: Buffer,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1024,
    overrideProvider?: string,
    overrideModel?: string,
    sourceOverride?: 'faktur' | 'apikey'
  ): Promise<string> {
    const provider = await AiService.getProvider(teamId, overrideProvider)
    const { key: apiKey, source } = await AiService.getApiKey(teamId, dek, provider, sourceOverride)
    const model = await AiService.getModel(teamId, provider, overrideModel)

    if (!apiKey) {
      if (source === 'custom') {
        throw new Error(
          `Aucune clé API configurée pour ${provider}. Ajoutez votre clé dans Paramètres > IA > Plus de paramètres.`
        )
      }
      throw new Error(
        `No API key configured for ${provider}. Set ${ENV_KEYS[provider]} or add a custom key in settings.`
      )
    }

    switch (provider) {
      case 'claude':
        return AiService.callClaude(apiKey, model, systemPrompt, userPrompt, maxTokens)
      case 'gemini':
        return AiService.callGemini(apiKey, model, systemPrompt, userPrompt, maxTokens)
      case 'groq':
        return AiService.callGroq(apiKey, model, systemPrompt, userPrompt, maxTokens)
      default:
        throw new Error(`Unknown AI provider: ${provider}`)
    }
  }

  /**
   * Chat with messages array (delegates to the right provider).
   */
  static async chat(
    teamId: string,
    dek: Buffer,
    systemPrompt: string,
    messages: ChatMessage[],
    maxTokens: number = 1024,
    overrideProvider?: string,
    overrideModel?: string,
    sourceOverride?: 'faktur' | 'apikey'
  ): Promise<string> {
    const provider = await AiService.getProvider(teamId, overrideProvider)
    const { key: apiKey, source } = await AiService.getApiKey(teamId, dek, provider, sourceOverride)
    const model = await AiService.getModel(teamId, provider, overrideModel)

    if (!apiKey) {
      if (source === 'custom') {
        throw new Error(
          `Aucune clé API configurée pour ${provider}. Ajoutez votre clé dans Paramètres > IA > Plus de paramètres.`
        )
      }
      throw new Error(`No API key configured for ${provider}.`)
    }

    switch (provider) {
      case 'claude':
        return AiService.chatClaude(apiKey, model, systemPrompt, messages, maxTokens)
      case 'gemini':
        return AiService.chatGemini(apiKey, model, systemPrompt, messages, maxTokens)
      case 'groq':
        return AiService.chatGroq(apiKey, model, systemPrompt, messages, maxTokens)
      default:
        throw new Error(`Unknown AI provider: ${provider}`)
    }
  }

  // ─── Claude (Anthropic) ────────────────────────────────────

  private static async callClaude(
    apiKey: string,
    model: string,
    system: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    return AiService.chatClaude(
      apiKey,
      model,
      system,
      [{ role: 'user', content: userPrompt }],
      maxTokens
    )
  }

  private static async chatClaude(
    apiKey: string,
    model: string,
    system: string,
    messages: ChatMessage[],
    maxTokens: number
  ): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Claude API error ${res.status}: ${errorText}`)
    }

    const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
    return data.content?.[0]?.text || ''
  }

  // ─── Gemini (Google) ───────────────────────────────────────

  private static async callGemini(
    apiKey: string,
    model: string,
    system: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    return AiService.chatGemini(
      apiKey,
      model,
      system,
      [{ role: 'user', content: userPrompt }],
      maxTokens
    )
  }

  private static async chatGemini(
    apiKey: string,
    model: string,
    system: string,
    messages: ChatMessage[],
    maxTokens: number
  ): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Gemini API error ${res.status}: ${errorText}`)
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  }

  // ─── Groq (OpenAI-compatible) ──────────────────────────────

  private static async callGroq(
    apiKey: string,
    model: string,
    system: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<string> {
    return AiService.chatGroq(
      apiKey,
      model,
      system,
      [{ role: 'user', content: userPrompt }],
      maxTokens
    )
  }

  private static async chatGroq(
    apiKey: string,
    model: string,
    system: string,
    messages: ChatMessage[],
    maxTokens: number
  ): Promise<string> {
    const openaiMessages = [
      { role: 'system' as const, content: system },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ]

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: openaiMessages }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Groq API error ${res.status}: ${errorText}`)
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content || ''
  }
}
