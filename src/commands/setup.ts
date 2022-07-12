import prompts from 'prompts'
import { awsConfig, getAwsProfileKey, isAwsAccessKeyId, isAwsMfaDevice, isAwsSecretAccessKey } from '../utils/aws'
import keyRing, { isBase32, isStoredCredentials, StoredCredentials } from '../utils/key-ring'
import { Logger } from '../utils/output'
import { kExitFailure, program } from '../utils/system'

export default async function setupProfile (profile: undefined | string): Promise<void> {
  const profileKey = getAwsProfileKey(profile)
  const existing = await keyRing.getCredentials(profileKey)
  if (existing != null) {
    Logger.current.warn(`${profile ?? 'default'} profile already exists, updating credentials!`)
  }

  const credentials: StoredCredentials = await prompts([
      {
        type: 'text' as const,
        name: 'keyId' as const,
        message: 'AWS Key ID',
        validate: value => isAwsAccessKeyId(value)
      },
      {
        type: 'password' as const,
        name: 'secretKey' as const,
        message: 'AWS Secret Key',
        validate: value => isAwsSecretAccessKey(value)
      },
      {
        type: 'text' as const,
        name: 'mfaDevice' as const,
        message: 'MFA Device Serial or ARN',
        validate: value => value == null || isAwsMfaDevice(value)
      },
      {
        type: prev => isAwsMfaDevice(prev) ? 'password' : null,
        name: 'mfaKey' as const,
        message: 'MFA Source Key',
        validate: value => isBase32(value)
      }
    ],
    {
      onCancel: (): never => {
        Logger.current.warn('Cancelling')
        process.exit(kExitFailure)
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

  Logger.current.log(originalProfileConfig == null ? `[${profileKey}] created` : `[${profileKey}] updated`)
}
