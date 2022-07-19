import envPaths from 'env-paths'
import { program } from './branding'

export const kExitSuccess = 0
export const kExitFailure = 1

export function toMessage (reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }

  return String(reason)
}

const kPaths = envPaths(program.name, { suffix: '' })
export const programPaths = (): typeof kPaths => kPaths

export class CancelError extends Error {
  constructor (msg?: string) {
    super(msg ?? 'Cancelled')
  }
}
