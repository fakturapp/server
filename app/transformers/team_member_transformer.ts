import type TeamMember from '#models/team/team_member'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class TeamMemberTransformer extends BaseTransformer<TeamMember> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'userId',
        'role',
        'status',
        'invitedEmail',
        'joinedAt',
        'invitedAt',
      ]),
      user: this.resource.userId
        ? {
            id: this.resource.user?.id,
            fullName: this.resource.user?.fullName,
            email: this.resource.user?.email,
            avatarUrl: this.resource.user?.avatarUrl,
          }
        : null,
    }
  }
}
