import { BaseEvent } from '@adonisjs/core/events'

export default class TeamMemberInvited extends BaseEvent {
  constructor(
    public email: string,
    public inviterName: string,
    public inviteUrl: string
  ) {
    super()
  }
}
