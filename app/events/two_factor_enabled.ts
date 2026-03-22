import { BaseEvent } from '@adonisjs/core/events'

export default class TwoFactorEnabled extends BaseEvent {
  constructor(
    public email: string,
    public name?: string
  ) {
    super()
  }
}
