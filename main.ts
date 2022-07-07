import yargs from 'yargs'
import getSession from './commands/session'
import setupProfile from './commands/setup'
import { kExitFailure, toMessage } from './utils/system'

async function guard (op: () => void | Promise<void>): Promise<void> {
  try {
    await op()
  } catch (reason: unknown) {
    console.error(toMessage(reason))
    process.exit(kExitFailure)
  }
}

export default async function main (): Promise<void> {
  const cli = await yargs
    .scriptName('aws-credentials')
    .usage('$0 <cmd> [args]')
    .command({
      command: 'setup [profile]',
      describe: 'Setup a profile',
      builder: builder => builder.positional('profile', {
        type: 'string',
        describe: 'A name for the profile'
      }),
      handler: async argv => await guard(() => setupProfile(argv.profile))
    })
    .command({
      command: 'session [profile]',
      describe: 'Gets a session token for a profile',
      builder: builder => builder.positional('profile', {
        type: 'string',
        describe: 'The name of the profile'
      }),
      handler: async argv => await guard(() => getSession(argv.profile))
    })
    .demandCommand()
    .version()
    .strict()
    .help()
    .argv
}

declare global {
  const kMainFilename: string
}
