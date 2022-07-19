import { normalize, resolve } from 'node:path'
import process from 'node:process'
import { DateTime } from 'luxon'
import { createLogger, format, transports } from 'winston'
import { program } from './branding'
import { kExitFailure, programPaths } from './system'
import type { TransformableInfo } from 'logform'

function makeLogTimestamp (isoTimestamp: undefined | string): string {
  return isoTimestamp != null
    ? DateTime.fromISO(isoTimestamp).toFormat('yyyy-MM-dd HH:mm:ss.SSS')
    : DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss.SSS')
}

function transformMessage (message: unknown): string {
  return typeof message === 'string' ? message : JSON.stringify(message)
}

const logPath = normalize(resolve(programPaths().log, `${program.name}.log`))

interface ExtendedInfo extends TransformableInfo {
  timestamp?: string
  stack?: string
}

const logTransports = [
  new transports.File({
    filename: logPath,
    level: 'warn',
    format: format.combine(
      format.timestamp(),
      format.printf(
        (info: ExtendedInfo) => info.stack != null
          ? `[${makeLogTimestamp(info.timestamp)}] [${program.name}] [${info.level}] ${info.stack}`
          : `[${makeLogTimestamp(info.timestamp)}] [${program.name}] [${info.level}] ${transformMessage(info.message)}`
      )
    )
  }),
  new transports.Console({
    format: format.cli()
  })
]

const logger = createLogger({
  level: 'info',
  format: format.errors({ stack: true }),
  transports: [...logTransports]
})

process.on('unhandledRejection', reason => {
  logger.error(reason)
  process.exitCode = kExitFailure
})

process.on('uncaughtException', reason => {
  logger.error(reason)
  process.exitCode = kExitFailure
})

logger.exitOnError = false

export default logger