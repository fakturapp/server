import { BaseEvent } from '@adonisjs/core/events'

export default class RecoveryKeyGenerated extends BaseEvent {
  constructor(
    public email: string,
    public recoveryKey: string,
    public name?: string
  ) {
    super()
  }
}
