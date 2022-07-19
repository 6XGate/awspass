import { stripIndents } from 'common-tags'
import yargs from 'yargs'
import getSession from './commands/session'
import setupProfile from './commands/setup'
import { program } from './utils/branding'
import logger from './utils/logger'
import { CancelError, kExitFailure, kExitSuccess } from './utils/system'

async function main (): Promise<void> {
  // Default the exit code to success, just to do something with this constant
  process.exitCode = kExitSuccess

  const versionOutput = stripIndents`
    ${program.name} ${program.version}
    Copyright \u00A9${program.copyrightRange} ${program.authors}
    License ${program.license} ${program.licenseUrl != null ? `\u003C${program.licenseUrl}\u003E` : ''}
    ${program.isFree
      ? stripIndents`
        This is free software: you are free to change and redistribute it.
        There is NO WARRANTY, to the extent permitted by law.`
      : undefined}`

  try {
    await yargs
      .scriptName(program.name)
      .usage('$0 <cmd> [args]')
      .command({
        command: 'setup [profile]',
        describe: 'setup a profile',
        builder: builder => builder.positional('profile', {
          type: 'string',
          describe: 'A name for the profile'
        }),
        handler: async argv => await setupProfile(argv.profile)
      })
      .command({
        command: 'session [profile]',
        describe: 'gets a session token for a profile',
        builder: builder => builder.positional('profile', {
          type: 'string',
          describe: 'The name of the profile'
        }),
        handler: async argv => await getSession(argv.profile)
      })
      .showHelpOnFail(false, 'Specify --help for available options')
      .version('version', 'Show version number', versionOutput)
      .fail((message, error) => {
        // Only show error messages for yargs errors, let regular exceptions fall through
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- @types/yargs forgets that all fail callback args can be nullish
        if (message != null) {
          logger.error(message)
          console.error('Specify --help for available options')
          process.exitCode = kExitFailure
        }
      })
      .exitProcess(false)
      .demandCommand()
      .completion()
      .strict()
      .help()
      .argv
  } catch (error: unknown) {
    process.exitCode = kExitFailure
    if (error instanceof CancelError) {
      // Cancel errors should not be logged, just exit after echoing the message
      console.error(error.message)
    } else {
      logger.error(error)
    }
  }
}

await main()
