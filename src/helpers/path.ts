import { homedir, platform } from 'node:os'
import { join, resolve, sep } from 'node:path'
import envPaths from 'env-paths'
import program from '../core/package'
import type { Paths as EnvPaths } from 'env-paths'

type PathResolvers = {
  [P in keyof EnvPaths]: (...segments: string[]) => string
}

export class Paths implements PathResolvers {
  paths = envPaths(program.name, { suffix: '' })

  static prepare (...segments: string[]): string {
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

  data (...segments: string[]): string {
    return resolve(this.paths.data, ...segments)
  }

  config (...segments: string[]): string {
    return resolve(this.paths.config, ...segments)
  }

  cache (...segments: string[]): string {
    return resolve(this.paths.cache, ...segments)
  }

  log (...segments: string[]): string {
    return resolve(this.paths.log, ...segments)
  }

  temp (...segments: string[]): string {
    return resolve(this.paths.temp, ...segments)
  }
}

export const paths = new Paths()
