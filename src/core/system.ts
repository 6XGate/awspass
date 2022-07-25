import envPaths from 'env-paths'
import program from './package'

export const kExitSuccess = 0
export const kExitFailure = 1

const kPaths = envPaths(program.name, { suffix: '' })
export const programPaths = (): typeof kPaths => kPaths

export class CancelError extends Error {
  constructor (msg?: string) {
    super(msg ?? 'Cancelled')
  }
}
