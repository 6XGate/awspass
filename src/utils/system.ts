import envPaths from 'env-paths'
import { program } from './branding'
import logger from './logger'

export const kExitSuccess = 0
export const kExitFailure = 1

const kPaths = envPaths(program.name, { suffix: '' })
export const programPaths = (): typeof kPaths => kPaths

export class CancelError extends Error {
  constructor (msg?: string) {
    super(msg ?? 'Cancelled')
  }
}

export function onFailure (reason: unknown, showHelpHint = false): false {
  process.exitCode = kExitFailure
  reason instanceof CancelError
    ? logger.error(reason.message)
    : logger.error(reason)

  if (showHelpHint) {
    console.error('Specify --help for available options')
  }

  return false
}
