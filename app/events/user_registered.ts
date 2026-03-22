import { BaseEvent } from '@adonisjs/core/events'

export default class UserRegistered extends BaseEvent {
  constructor(
    public email: string,
    public token: string,
    public name?: string
  ) {
    super()
  }
}
