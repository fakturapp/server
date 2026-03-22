import { BaseEvent } from '@adonisjs/core/events'

export default class SecurityCodeRequested extends BaseEvent {
  constructor(
    public email: string,
    public code: string,
    public name?: string
  ) {
    super()
  }
}
