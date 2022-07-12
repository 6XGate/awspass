import { basename } from 'node:path'

export const kExitSuccess = 0
export const kExitFailure = 1

export function toMessage (reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }

  return String(reason)
}

export const program = {
  get filePath (): string {
    // HACK: Uses __filename since this program will be bundled.
    return __filename
  },
  get name (): string {
    // HACK: Uses __filename since this program will be bundled.
    return basename(__filename)
  },
}
