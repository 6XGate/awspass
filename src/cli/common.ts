import { Option, program as cli } from 'commander'
import type { Command } from 'commander'

export const kPromptTools = ['cscript', 'osascript', 'zenity', 'kdialog', 'yad', 'terminal'] as const
export type PromptTool = typeof kPromptTools[number]

export interface CommonOptions {
  terminal: boolean
  profile?: string
  region?: string
  prompt?: PromptTool
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

export function command (name: string, useTerminal = false): Command {
  return cli.command(name)
    .option('--profile <profile>', 'profile to use', process.env.AWS_PROFILE)
    .option('--region <region>', 'target AWS region')
    .addOption(new Option('--prompt <tool>', 'prompt tool').choices(kPromptTools))
    // Really used to pass this information along to the command action
    .addOption(new Option('--terminal', 'allow OTP prompts on the terminal').default(useTerminal).hideHelp())
}
