import mail from '@adonisjs/mail/services/main'
import TeamInviteNotification from '#mails/team_invite_notification'
import type TeamMemberInvited from '#events/team_member_invited'

export default class SendTeamInviteEmail {
  async handle(event: TeamMemberInvited) {
    await mail.sendLater(
      new TeamInviteNotification(event.email, event.inviterName, event.inviteUrl)
    )
  }
}
