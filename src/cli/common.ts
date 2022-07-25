import { program as cli } from 'commander'
import type { Command } from 'commander'

export interface CommonOptions {
  profile?: string
  region?: string
}

cli.exitOverride(err => { throw err })

cli.configureOutput({
  // Output real errors to the logger, output other Commander message to stderr
  writeOut: message => console.error(message),
  writeErr: message => console.error(message),
  // Don't output errors, they will be caught
  outputError: () => { /* noop */ }
})

cli.showHelpAfterError(false)
cli.showSuggestionAfterError(false)
cli.enablePositionalOptions()

export { program as cli } from 'commander'

export function command (name: string): Command {
  return cli.command(name)
    .option('--profile <profile>', 'profile to use', process.env.AWS_PROFILE)
    .option('--region <region>', 'target AWS region', process.env.AWS_REGION)
}
