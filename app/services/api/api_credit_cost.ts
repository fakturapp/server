const HEAVY_SEGMENT = /\/(pdf|export|exports|ai|bulk|batch|render|download)(\/|$)/i

export const CREDIT_COST_READ = 1
export const CREDIT_COST_DELETE = 3
export const CREDIT_COST_WRITE = 5
export const CREDIT_COST_HEAVY = 25

export function creditCostFor(method: string, path: string): number {
  if (HEAVY_SEGMENT.test(path)) return CREDIT_COST_HEAVY
  const verb = method.toUpperCase()
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return CREDIT_COST_READ
  if (verb === 'DELETE') return CREDIT_COST_DELETE
  return CREDIT_COST_WRITE
}
