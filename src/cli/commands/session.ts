import { Option } from 'commander'
import { kEnvNames, login } from '../../core/session'
import { command } from '../common'
import type { AwsCredentialPayload } from '../../helpers/aws'
import type { CommonOptions } from '../common'

const kOutputType = ['json', 'env'] as const
type OutputType = typeof kOutputType[number]

interface SessionOptions extends CommonOptions {
  output: OutputType
}

command('session', false)
  .description('starts a session')
  .addOption(new Option('--output <format>', 'output format').choices(kOutputType).default('json'))
  .action(async (options: SessionOptions) => {
    sendCredentials(await login(options), options.output)
  })

function sendCredentials (payload: AwsCredentialPayload, outputType: OutputType = 'json'): void {
  switch (outputType) {
    case 'json':
      console.log(JSON.stringify(payload, null, 2))

      return

    case 'env':
      for (const [name, value] of Object.entries(payload)) {
        if (name in kEnvNames) {
          console.log(`${kEnvNames[name]}=${String(value)}`)
        }
      }

      return

    default:
      throw new TypeError(`Unknown or unsupported output type: ${String(outputType)}`)
  }
}
