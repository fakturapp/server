import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

/**
 * Préférence de notification par utilisateur et par type d'événement.
 * Absence de ligne = activé par défaut (opt-out), conformément au plan.
 */
export default class NotificationPreference extends BaseModel {
  public static table = 'notification_preferences'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userId: string

  @column()
  declare eventType: string

  @column()
  declare enabled: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}

/**
 * Catalogue des types d'événements de notification poussables.
 * Aligné avec les catégories iOS (thread-id / UNNotificationCategory).
 */
export const NOTIFICATION_EVENT_TYPES = [
  'payment.received', // paiement Stripe encaissé
  'payment.to_confirm', // virement signalé au checkout — à confirmer
  'payment.confirmed', // paiement confirmé (par un coéquipier)
  'invoice.overdue', // facture en retard
  'quote.accepted', // devis accepté
  'quote.refused', // devis refusé
  'team.activity', // invitations / changements de rôle
  'security.alert', // nouvelle connexion / sécurité
] as const

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]
