import type Team from '#models/team/team'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    dek?: Buffer
    team?: Team
  }
}
