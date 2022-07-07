export const kExitSuccess = 0
export const kExitFailure = 1

export function toMessage (reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }

  return String(reason)
}
