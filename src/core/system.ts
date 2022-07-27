export const kExitSuccess = 0
export const kExitFailure = 1

export class CancelError extends Error {
  constructor (msg?: string) {
    super(msg ?? 'Cancelled')
  }
}
