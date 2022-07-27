import { CommanderError } from 'commander'
import { stripIndents } from 'common-tags'
import { cli } from './cli/common'
import logger from './core/logger'
import program from './core/package'
import { CancelError, kExitFailure, kExitSuccess } from './core/system'
import { removeErrorTag } from './helpers/error'

/* eslint-disable node/no-unsupported-features/es-syntax -- Webpack supports this with eager mode */

async function main (): Promise<void> {
  // Default the exit code to success, just to do something with this constant
  process.exitCode = kExitSuccess

  const helpEpilog = stripIndents`
    ${program.name} ${program.version}
    Copyright \u00A9${program.copyrightRange} ${program.authors}
    License ${program.license} ${program.licenseUrl != null ? `\u003C${program.licenseUrl}\u003E` : ''}
    ${program.isFree
      ? stripIndents`
        This is free software: you are free to change and redistribute it.
        There is NO WARRANTY, to the extent permitted by law.`
      : undefined}`

  try {
    cli
      .name(program.baseName)
      .description(program.description)
      .version(program.version)
      .addHelpText('after', helpEpilog)

    await import(/* webpackMode: "eager" */ './cli/commands/exec')
    await import(/* webpackMode: "eager" */ './cli/commands/session')
    await import(/* webpackMode: "eager" */ './cli/commands/setup')

    await cli.parseAsync()
  } catch (error: unknown) {
    if (error instanceof CommanderError) {
      if (error.code === 'commander.helpDisplayed') {
        return
      }

      process.exitCode = error.exitCode
      logger.error(removeErrorTag(error.message))
      console.error(`Use ${program.name} --help for available commands and options`)
    } else if (error instanceof CancelError) {
      process.exitCode = kExitFailure
      logger.error(error.message)
    } else {
      process.exitCode = kExitFailure
      logger.error(error)
    }
  }
}

await main()
