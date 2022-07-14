import { stripIndents } from 'common-tags'
import yargs from 'yargs'
import getSession from './commands/session'
import setupProfile from './commands/setup'
import { program } from './utils/branding'
import { ConditionalLogger, ConsoleLogger, FileLogger, Logger, LoggerStack } from './utils/output'
import { kExitFailure, toMessage } from './utils/system'

async function main (): Promise<void> {
  const versionOutput = stripIndents`
    ${program.name} ${program.version}
    Copyright \u00A9${program.copyrightRange} ${program.authors}
    License ${program.license} ${program.licenseUrl != null ? `\u003C${program.licenseUrl}\u003E` : ''}
    ${program.isFree
      ? stripIndents`
        This is free software: you are free to change and redistribute it.
        There is NO WARRANTY, to the extent permitted by law.`
      : undefined}`

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
      handler: async argv => {
        Logger.current = new LoggerStack(
          ConsoleLogger.main,
          await FileLogger.open()
        )

        await setupProfile(argv.profile)
      }
    })
    .command({
      command: 'session [profile]',
      describe: 'gets a session token for a profile',
      builder: builder => builder.positional('profile', {
        type: 'string',
        describe: 'The name of the profile'
      }),
      handler: async argv => {
        Logger.current = new LoggerStack(
          await FileLogger.open(),
          new ConditionalLogger(ConsoleLogger.main, { error: true })
        )

        await getSession(argv.profile)
      }
    })
    .showHelpOnFail(false, 'Specify --help for available options')
    .version('version', 'Show version number', versionOutput)
    .fail(message => {
      // Only show error messages for yargs errors, let regular exceptions fall through
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Yargs types forgot that fail callback args can be nullish
      if (message != null) {
        console.error(message)
        console.error('Specify --help for available options')
      }
    })
    .exitProcess(false)
    .demandCommand()
    .completion()
    .strict()
    .help()
    .argv
}

// Makes errors less verbose to the user.
process.on('unhandledRejection', reason => {
  console.error(toMessage(reason))
  process.exitCode = kExitFailure
})

// Makes errors less verbose to the user.
process.on('uncaughtException', reason => {
  console.error(toMessage(reason))
  process.exitCode = kExitFailure
})

await main()
