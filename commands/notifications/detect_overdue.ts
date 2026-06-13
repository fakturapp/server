import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Détecte les factures arrivées à échéance (statut 'sent', dueDate < today),
 * les passe en 'overdue' et envoie une notification push au propriétaire
 * de l'équipe. À planifier quotidiennement (cron, ex. 9h).
 *
 *   node ace notifications:detect-overdue
 */
export default class DetectOverdue extends BaseCommand {
  static commandName = 'notifications:detect-overdue'
  static description = 'Mark due invoices as overdue and push a notification to team owners.'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { DateTime } = await import('luxon')
    const { default: Invoice } = await import('#models/invoice/invoice')
    const { default: Team } = await import('#models/team/team')
    const { default: pushService } = await import('#services/push/push_service')

    const today = DateTime.now().toSQLDate()!

    // Factures qui basculent en retard aujourd'hui.
    const newlyOverdue = await Invoice.query()
      .where('status', 'sent')
      .whereNotNull('dueDate')
      .where('dueDate', '<', today)

    if (newlyOverdue.length === 0) {
      this.logger.info('No newly overdue invoices.')
      return
    }

    await Invoice.query()
      .where('status', 'sent')
      .whereNotNull('dueDate')
      .where('dueDate', '<', today)
      .update({ status: 'overdue' })

    // Regroupe par équipe pour une notification par propriétaire.
    const byTeam = new Map<string, typeof newlyOverdue>()
    for (const invoice of newlyOverdue) {
      const list = byTeam.get(invoice.teamId) ?? []
      list.push(invoice)
      byTeam.set(invoice.teamId, list)
    }

    let pushed = 0
    for (const [teamId, invoices] of byTeam) {
      const team = await Team.find(teamId)
      if (!team?.ownerId) continue

      if (invoices.length === 1) {
        const invoice = invoices[0]
        await pushService.notifyUser(team.ownerId, 'invoice.overdue', {
          title: 'Facture en retard',
          body: `${invoice.invoiceNumber} est arrivée à échéance`,
          category: 'INVOICE_OVERDUE',
          threadId: invoice.id,
          interruptionLevel: 'active',
          relevanceScore: 0.8,
          data: {
            invoiceId: invoice.id,
            deepLink: `faktur://invoice/${invoice.id}`,
          },
        })
      } else {
        await pushService.notifyUser(team.ownerId, 'invoice.overdue', {
          title: 'Factures en retard',
          body: `${invoices.length} factures sont arrivées à échéance`,
          interruptionLevel: 'active',
          relevanceScore: 0.8,
          data: { deepLink: 'faktur://activity' },
        })
      }
      pushed++
    }

    this.logger.info(`Marked ${newlyOverdue.length} invoice(s) overdue, pushed to ${pushed} team(s).`)
  }
}
