import type { Predicate } from 'vahvista'

export class ArgumentError extends Error {
  constructor (arg: string, message: string, value: unknown) {
    super(`(${arg}): ${message}, ${JSON.stringify(value, null, 2)}`)
  }
}

export function validate<T> (validator: Predicate<T>, args: Record<string, unknown>, message: string): void {
  for (const [arg, value] of Object.entries(args)) {
    if (!validator(value)) {
      throw new ArgumentError(arg, message, value)
    }
  }
}
