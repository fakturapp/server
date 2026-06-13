import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import LoginChallenge from '#models/auth/login_challenge'
import PushDevice from '#models/push/push_device'
import User from '#models/account/user'

const CHALLENGE_TTL_SECONDS = 120

class AppLoginService {
  /** Code de correspondance à 2 chiffres (number-matching). */
  generateMatchCode(): string {
    return String(crypto.randomInt(10, 99))
  }

  /** Le bon code + 2 leurres, mélangés (présentés dans l'app). */
  matchOptions(correct: string): string[] {
    const options = new Set<string>([correct])
    while (options.size < 3) {
      options.add(String(crypto.randomInt(10, 99)))
    }
    const array = Array.from(options)
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  async createChallenge(
    user: User,
    context: { ip: string | null; userAgent: string | null; location: string | null }
  ): Promise<LoginChallenge> {
    return LoginChallenge.create({
      userId: user.id,
      status: 'pending',
      matchCode: this.generateMatchCode(),
      requireMatch: user.appLoginRequireMatch === true,
      ipAddress: context.ip,
      userAgent: context.userAgent ? context.userAgent.slice(0, 512) : null,
      location: context.location,
      consumed: false,
      expiresAt: DateTime.now().plus({ seconds: CHALLENGE_TTL_SECONDS }),
    })
  }

  /** Appareils enrôlés comme authentificateurs pour cet utilisateur. */
  async enrolledDevices(userId: string): Promise<PushDevice[]> {
    return PushDevice.query().where('user_id', userId).where('app_login_enabled', true)
  }

  async hasEnrolledDevice(userId: string): Promise<boolean> {
    const device = await PushDevice.query()
      .where('user_id', userId)
      .where('app_login_enabled', true)
      .first()
    return device !== null
  }
}

const appLoginService = new AppLoginService()
export default appLoginService
