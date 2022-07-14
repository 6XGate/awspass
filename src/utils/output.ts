import envPaths from 'env-paths'
import makeDir from 'make-dir'
import { writeSync } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { open } from 'node:fs/promises'
import { dirname, normalize, resolve } from 'node:path'
import { format } from 'node:util'
import { program } from './branding'

export const enum LogLevel {
  debug = 'debug',
  error = 'error',
  info = 'info',
  log = 'log',
  trace = 'trace',
  warn = 'warn'
}

export abstract class Logger {
  static get current (): Logger {
    return currentLogger
  }

  static set current (value: Logger) {
    currentLogger = value
  }

  debug (message?: unknown, ...optionalParams: unknown[]): void {
    this.out(LogLevel.debug, message, ...optionalParams)
  }

  error (message?: unknown, ...optionalParams: unknown[]): void {
    this.out(LogLevel.error, message, ...optionalParams)
  }

  info (message?: unknown, ...optionalParams: unknown[]): void {
    this.out(LogLevel.info, message, ...optionalParams)
  }

  log (message?: unknown, ...optionalParams: unknown[]): void {
    this.out(LogLevel.log, message, ...optionalParams)
  }

  trace (message?: unknown, ...optionalParams: unknown[]): void {
    this.out(LogLevel.trace, message, ...optionalParams)
  }

  warn (message?: unknown, ...optionalParams: unknown[]): void {
    this.out(LogLevel.warn, message, ...optionalParams)
  }

  abstract out (level: LogLevel, message?: unknown, ...optionalParams: unknown[]): void
}

export class ConsoleLogger extends Logger {
  static get main (): ConsoleLogger {
    return kConsoleLogger
  }

  // Force use of `ConsoleLogger.main`
  protected constructor () {
    super()
  }

  override out (level: LogLevel, message?: unknown, ...optionalParams: unknown[]): void {
    if (message == null) {
      return
    }

    console[level](message, ...optionalParams)
  }
}

export class FileLogger extends Logger {
  private readonly handle: FileHandle

  private constructor (handle: FileHandle) {
    super()

    this.handle = handle

    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Required to properly close the logger
    process.once('beforeExit', async () => {
      await handle.close()
    })
  }

  static getLogPath (): string {
    const kPaths = envPaths(program.name, { suffix: '' })

    return normalize(resolve(kPaths.log))
  }

  static getLogFilePath (): string {
    return normalize(resolve(FileLogger.getLogPath(), `${program.name}.log`))
  }

  static async open (path?: string): Promise<FileLogger> {
    if (path == null || path.length === 0) {
      path = FileLogger.getLogFilePath()
    }

    await makeDir(dirname(path))
    const handle = await open(path, 'a')

    return new FileLogger(handle)
  }

  override out (level: LogLevel, message?: unknown, ...optionalParams: unknown[]): void {
    if (message == null) {
      return
    }

    optionalParams.length > 0
      ? writeSync(this.handle.fd, `${new Date().toISOString()}: ${level.toUpperCase()}: ${format(message, ...optionalParams)}`)
      : writeSync(this.handle.fd, `${new Date().toISOString()}: ${level.toUpperCase()}: ${String(message)}`)
  }
}

export class LoggerStack extends Logger {
  private readonly stack: Logger[]

  constructor (...stack: Logger[]) {
    super()

    this.stack = stack
  }

  override out (level: LogLevel, message?: unknown, ...optionalParams: unknown[]): void {
    if (message == null) {
      return
    }

    if (optionalParams.length > 0) {
      message = format(message, ...optionalParams)
    }

    for (const logger of this.stack) {
      logger.out(level, message)
    }
  }
}

type LoggerConditions = { [L in LogLevel]?: boolean }

export class ConditionalLogger extends Logger {
  logger: Logger
  conditions: LoggerConditions

  constructor (logger: Logger, conditions?: LoggerConditions) {
    super()

    this.logger = logger
    this.conditions = conditions ?? {}
  }

  override out (level: LogLevel, message?: unknown, ...optionalParams: unknown[]): void {
    if (message == null) {
      return
    }

    if (this.conditions[level] === true) {
      this.logger.out(level, message, ...optionalParams)
    }
  }
}

const kConsoleLogger = new class extends ConsoleLogger { public constructor () { super() } }()

let currentLogger: Logger = ConsoleLogger.main
