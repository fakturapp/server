import type { HttpContext } from '@adonisjs/core/http'
import BugReport from '#models/admin/bug_report'

export default class Create {
  async handle({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { subject, description, stepsToReproduce, severity } = request.only([
      'subject',
      'description',
      'stepsToReproduce',
      'severity',
    ])

    if (!subject?.trim() || !description?.trim()) {
      return response.badRequest({ message: 'Le sujet et la description sont requis' })
    }

    const validSeverities = ['low', 'medium', 'high', 'critical']
    const finalSeverity = validSeverities.includes(severity) ? severity : 'medium'

    const bugReport = await BugReport.create({
      userId: user.id,
      subject: subject.trim(),
      description: description.trim(),
      stepsToReproduce: stepsToReproduce?.trim() || null,
      severity: finalSeverity,
    })

    return response.created({ bugReport })
  }
}
