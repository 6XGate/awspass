import { homedir, platform } from 'node:os'
import { join, resolve, sep } from 'node:path'

export function * backStep (path: string): Generator<string> {
  let previous: string | undefined
  while (path !== previous) {
    yield path

    previous = path
    path = resolve(path, '..')
  }
}

export function resolvePath (...segments: string[]): string {
  if (platform() === 'win32') {
    return resolve(...segments)
  }

  return resolve(...segments.map(segment => {
    if (segment.length === 0) {
      return segment
    }

    if (segment.startsWith(`~${sep}`)) {
      return join(homedir(), segment.substring(2))
    }

    if (segment.startsWith('~')) {
      throw new ReferenceError('Only tilda expansion to the current user home is supported')
    }

    return segment
  }))
}
