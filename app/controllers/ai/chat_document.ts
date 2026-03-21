import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import AiService from '#services/ai/ai_service'

const chatDocumentValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(2000),
    currentDocument: vine.object({
      subject: vine.string().trim(),
      lines: vine.array(
        vine.object({
          description: vine.string().trim(),
          quantity: vine.number(),
          unitPrice: vine.number(),
          vatRate: vine.number(),
        })
      ),
      notes: vine.string().trim().optional(),
      acceptanceConditions: vine.string().trim().optional(),
    }),
    type: vine.enum(['invoice', 'quote']),
    provider: vine.enum(['claude', 'gemini', 'groq']).optional(),
    model: vine.string().trim().maxLength(100).optional(),
    mode: vine.enum(['edition', 'question', 'libre']).optional(),
    source: vine.enum(['faktur', 'apikey']).optional(),
  })
)

// ─── System Prompts per Mode ──────────────────────────────────────────

function buildEditionPrompt(docType: string, currentDoc: string): string {
  return `Tu es un assistant qui modifie un document de facturation français (${docType}). Voici le document actuel en JSON:

${currentDoc}

L'utilisateur demande une modification. Applique la modification et retourne ta réponse dans le format JSON suivant:
{
  "message": "Description courte en markdown de ce que tu as modifié",
  "document": {
    "subject": "Objet du document",
    "lines": [
      {
        "description": "Description",
        "quantity": 1,
        "unitPrice": 500.00,
        "vatRate": 20
      }
    ],
    "notes": "Notes",
    "acceptanceConditions": "Conditions"
  }
}

Règles:
- Conserve tous les champs non modifiés
- Applique uniquement les changements demandés par l'utilisateur
- Les prix doivent rester réalistes
- Le champ "message" doit être en markdown et décrire brièvement les changements effectués
- Réponds UNIQUEMENT avec le JSON, rien d'autre`
}

function buildQuestionPrompt(docType: string, currentDoc: string): string {
  return `Tu es un expert en facturation française et en conformité légale. Tu analyses des documents de type "${docType}".

Voici le document actuel:
${currentDoc}

Tu dois répondre aux questions de l'utilisateur en respectant ces règles:

**Format de réponse (JSON obligatoire):**
{
  "message": "Ta réponse complète en markdown"
}

**Règles de réponse:**
- Utilise du **markdown structuré** avec titres, listes, tableaux si nécessaire
- Applique un système de **code couleur** pour la conformité:
  - 🟢 **Conforme** : L'élément respecte les règles et lois en vigueur
  - 🟡 **Attention** : L'élément nécessite une vérification ou est partiellement conforme
  - 🔴 **Non conforme** : L'élément ne respecte pas les règles légales
  - 🔵 **Information** : Conseil ou information complémentaire

- Cite les articles de loi ou règlements pertinents (Code de commerce, CGI, etc.)
- Structure ta réponse avec des sections claires
- Indique les mentions obligatoires manquantes le cas échéant
- Ne modifie JAMAIS le document, réponds uniquement à la question
- Réponds UNIQUEMENT avec le JSON, rien d'autre`
}

function buildLibrePrompt(docType: string, currentDoc: string): string {
  return `Tu es un assistant créatif pour les documents de facturation français (${docType}). Voici le document actuel:

${currentDoc}

L'utilisateur te donne une instruction libre. Tu dois:
1. Exécuter la tâche demandée
2. Retourner les modifications proposées

**Format de réponse (JSON obligatoire):**
{
  "message": "Explication en markdown de ce que tu proposes",
  "document": {
    "subject": "Objet du document",
    "lines": [
      {
        "description": "Description",
        "quantity": 1,
        "unitPrice": 500.00,
        "vatRate": 20
      }
    ],
    "notes": "Notes",
    "acceptanceConditions": "Conditions"
  },
  "modifications": [
    {
      "content": "Description en markdown de chaque modification individuelle effectuée"
    }
  ]
}

Règles:
- Le champ "message" résume ce que tu as fait en markdown
- Le champ "modifications" liste chaque changement individuel en markdown (surligné)
- Le document doit refléter toutes les modifications appliquées
- Sois créatif tout en restant professionnel et réaliste
- Les prix doivent rester réalistes
- Réponds UNIQUEMENT avec le JSON, rien d'autre`
}

// ─── Controller ───────────────────────────────────────────────────────

export default class ChatDocument {
  async handle(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const ai = new AiService()

    if (!(await ai.isEnabled(teamId))) {
      return response.forbidden({ message: 'AI is not enabled. Activate it in Settings > AI.' })
    }

    const payload = await request.validateUsing(chatDocumentValidator)
    const mode = payload.mode || 'edition'
    const docType = payload.type === 'invoice' ? 'facture' : 'devis'
    const currentDoc = JSON.stringify(payload.currentDocument, null, 2)

    // Build mode-specific system prompt
    let systemPrompt: string
    switch (mode) {
      case 'question':
        systemPrompt = buildQuestionPrompt(docType, currentDoc)
        break
      case 'libre':
        systemPrompt = buildLibrePrompt(docType, currentDoc)
        break
      case 'edition':
      default:
        systemPrompt = buildEditionPrompt(docType, currentDoc)
        break
    }

    try {
      const result = await ai.generate(
        teamId,
        dek,
        systemPrompt,
        payload.message,
        mode === 'question' ? 4096 : 2048,
        payload.provider,
        payload.model,
        payload.source as 'faktur' | 'apikey' | undefined,
      )

      // Parse JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return response.badRequest({ message: 'Failed to parse AI response' })
      }

      const parsed = JSON.parse(jsonMatch[0])

      if (mode === 'question') {
        // Question mode: return message only, no document modification
        return response.ok({
          message: parsed.message || result,
        })
      }

      if (mode === 'libre') {
        // Libre mode: return message + document + modifications list
        if (!parsed.document?.subject || !Array.isArray(parsed.document?.lines)) {
          return response.badRequest({ message: 'Invalid document structure from AI' })
        }
        return response.ok({
          message: parsed.message || 'Modifications appliquées.',
          document: parsed.document,
          modifications: parsed.modifications || [],
        })
      }

      // Edition mode: return message + document
      if (!parsed.document?.subject || !Array.isArray(parsed.document?.lines)) {
        // Fallback: try legacy format (just the document at root level)
        if (parsed.subject && Array.isArray(parsed.lines)) {
          return response.ok({
            message: parsed.message || 'Document mis à jour.',
            document: {
              subject: parsed.subject,
              lines: parsed.lines,
              notes: parsed.notes || '',
              acceptanceConditions: parsed.acceptanceConditions || '',
            },
          })
        }
        return response.badRequest({ message: 'Invalid document structure from AI' })
      }

      return response.ok({
        message: parsed.message || 'Document mis à jour.',
        document: parsed.document,
      })
    } catch (error: any) {
      return response.internalServerError({ message: 'AI chat failed', error: error.message })
    }
  }
}
