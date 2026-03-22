import { BaseEvent } from '@adonisjs/core/events'

export default class PasswordResetRequested extends BaseEvent {
  constructor(
    public email: string,
    public token: string,
    public name?: string
  ) {
    super()
  }
}
