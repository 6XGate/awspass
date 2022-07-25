import { execa } from 'execa'
import { kEnvNames, login } from '../../core/session'
import { command } from '../common'
import type { CommonOptions } from '../common'

command('exec')
  .description('execs a command')
  .argument('<command>', 'command to run')
  .argument('[args...]', 'arguments for command')
  .passThroughOptions()
  .action(async (command: string, args: string[], options: CommonOptions) => {
    const creds = await login(options)
    const env: Record<string, string> = { }
    for (const [name, value] of Object.entries(creds)) {
      if (name in kEnvNames) {
        env[kEnvNames[name]] = String(value)
      }
    }

    const result = await execa(command, args, { env, stdio: 'inherit', reject: false })

    process.exitCode = result.exitCode
  })
