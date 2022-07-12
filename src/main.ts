import yargs from 'yargs'
import getSession from './commands/session'
import setupProfile from './commands/setup'
import { ConditionalLogger, ConsoleLogger, FileLogger, Logger, LoggerStack } from './utils/output'
import { kExitFailure, kExitSuccess, program, toMessage } from './utils/system'

async function guard (op: () => void | Promise<void>): Promise<void> {
  try {
    await op()
  } catch (reason: unknown) {
    Logger.current.error(toMessage(reason))
    process.exit(kExitFailure)
  }
}

async function main (): Promise<void> {
  const cli = await yargs
    .scriptName(program.name)
    .usage('$0 <cmd> [args]')
    .command({
      command: 'setup [profile]',
      describe: 'Setup a profile',
      builder: builder => builder.positional('profile', {
        type: 'string',
        describe: 'A name for the profile'
      }),
      handler: async argv => await guard(async () => {
        Logger.current = new LoggerStack(
          ConsoleLogger.main,
          await FileLogger.open()
        )

        await setupProfile(argv.profile)
      })
    })
    .command({
      command: 'session [profile]',
      describe: 'Gets a session token for a profile',
      builder: builder => builder.positional('profile', {
        type: 'string',
        describe: 'The name of the profile'
      }),
      handler: async argv => await guard(async () => {
        Logger.current = new LoggerStack(
          await FileLogger.open(),
          new ConditionalLogger(ConsoleLogger.main, { error: true })
        )

        await getSession(argv.profile)
      })
    })
    .demandCommand()
    .version()
    .strict()
    .help()
    .argv
}

try {
  await main()
  process.exit(kExitSuccess)
} catch (error: unknown) {
  Logger.current.error(toMessage(error))
  process.exit(kExitFailure)
}
