import kleur from 'kleur'
import prompts from 'prompts'
import { Argv } from 'yargs'
import { awsConfig, getAwsProfileKey, isAwsAccessKeyId, isAwsMfaDevice, isAwsSecretAccessKey } from '../utils/aws'
import { program } from '../utils/branding'
import keyRing, { isBase32, isStoredCredentials, StoredCredentials } from '../utils/key-ring'
import logger from '../utils/logger'
import { CancelError } from '../utils/system'

export const command = 'setup [profile]'

export const describe = 'setup a profile'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Must be deduced
export const builder = (builder: Argv) => builder
  .positional('profile', {
    type: 'string',
    describe: 'A name for the profile'
  })

type Arguments = Awaited<ReturnType<typeof builder>['argv']>

export async function handler ({ profile }: Arguments): Promise<void> {
  const profileKey = getAwsProfileKey(profile)
  const existing = await keyRing.getCredentials(profileKey)
  if (existing != null) {
    logger.warn(`${profile ?? 'default'} profile already exists, updating credentials!`)
  }

  const credentials: StoredCredentials = await prompts([
    {
      type: 'text' as const,
      name: 'keyId' as const,
      message: `AWS Key ID ${kleur.reset().dim('required (AXXXXXXXXXXXXXXXXXXX)')}`,
      validate: value => isAwsAccessKeyId(value)
    },
    {
      type: 'password' as const,
      name: 'secretKey' as const,
      message: `AWS Secret Key ${kleur.reset().dim('required (XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)')}`,
      validate: value => isAwsSecretAccessKey(value)
    },
    {
      type: 'text' as const,
      name: 'mfaDevice' as const,
      message: `MFA Device Serial or ARN ${kleur.reset().dim('optional (device serial) or (arn:aws:iam::############:mfa/user)')}`,
      validate: value => value == null || isAwsMfaDevice(value)
    },
    {
      type: prev => isAwsMfaDevice(prev) ? 'password' : undefined,
      name: 'mfaKey' as const,
      message: `MFA Source Key ${kleur.reset().dim('required')}`,
      validate: value => isBase32(value)
    }
  ],
  {
    onCancel: (): never => {
      throw new CancelError()
    }
  })

  if (!isStoredCredentials(credentials)) {
    throw new Error('Validation failed on user input')
  }

  const config = await awsConfig.getConfig()
  const originalProfileConfig = awsConfig.getProfile(config, profileKey)
  const command = profile != null && profile.length > 0
    ? `"${program.filePath}" session ${profile}`
    : `"${program.filePath}" session`

  const profileConfig = { ...originalProfileConfig, credential_process: command }

  await awsConfig.updateProfile(config, profileKey, profileConfig)
  await keyRing.storeCredentials(profileKey, credentials)

  logger.info(originalProfileConfig == null ? `[${profileKey}] created` : `[${profileKey}] updated`)
}
