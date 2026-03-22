import emitter from '@adonisjs/core/services/emitter'

import UserRegistered from '#events/user_registered'
import PasswordResetRequested from '#events/password_reset_requested'
import EmailChangeRequested from '#events/email_change_requested'
import SecurityCodeRequested from '#events/security_code_requested'
import TwoFactorEnabled from '#events/two_factor_enabled'
import TeamMemberInvited from '#events/team_member_invited'

emitter.on(UserRegistered, [() => import('#listeners/send_verification_email')])
emitter.on(PasswordResetRequested, [() => import('#listeners/send_password_reset_email')])
emitter.on(EmailChangeRequested, [() => import('#listeners/send_email_change_code')])
emitter.on(SecurityCodeRequested, [() => import('#listeners/send_security_code_email')])
emitter.on(TwoFactorEnabled, [() => import('#listeners/send_two_factor_enabled_email')])
emitter.on(TeamMemberInvited, [() => import('#listeners/send_team_invite_email')])
