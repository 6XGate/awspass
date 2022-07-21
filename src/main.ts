import { stripIndents } from 'common-tags'
import yargs from 'yargs'
import * as session from './commands/session'
import * as setup from './commands/setup'
import { program } from './utils/branding'
import { kExitSuccess, onFailure } from './utils/system'

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
      .command(setup)
      .command(session)
      .showHelpOnFail(false, 'Specify --help for available options')
      .version('version', 'Show version number', versionOutput)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- @types/yargs forgets that all fail callback args can be nullish
      .fail(message => (message != null ? onFailure(message, true) : false))
      .exitProcess(false)
      .demandCommand()
      .completion()
      .strict()
      .help()
      .argv
  } catch (error: unknown) {
    onFailure(error)
  }
}

await main()
