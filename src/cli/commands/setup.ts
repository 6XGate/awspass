import kleur from 'kleur'
import prompts from 'prompts'
import keyRing, { Base32, StoredCredentials } from '../../core/key-ring'
import logger from '../../core/logger'
import program from '../../core/package'
import { CancelError } from '../../core/system'
import { AwsAccessKeyId, awsConfig, AwsMfaDevice, AwsSecretAccessKey, getAwsProfileKey } from '../../helpers/aws'
import { toUndefinedIfEmpty } from '../../helpers/prompt'
import { command } from '../common'
import type { CommonOptions } from '../common'
import type z from 'zod'

command('setup')
  .summary('setup a profile')
  .action(async (options: CommonOptions) => {
    const profile = options.profile
    const profileKey = getAwsProfileKey(options)
    const existing = await keyRing.getCredentials(profileKey)
    if (existing != null) {
      logger.warn(`${profile ?? 'default'} profile already exists, updating credentials!`)
    }

    const credentials = StoredCredentials.parse(await prompts([
      {
        type: 'text' as const,
        name: 'keyId' as const,
        message: `AWS Key ID ${kleur.reset().dim('required (AXXXXXXXXXXXXXXXXXXX)')}`,
        format: toUndefinedIfEmpty,
        validate: is(AwsAccessKeyId)
      },
      {
        type: 'password' as const,
        name: 'secretKey' as const,
        message: `AWS Secret Key ${kleur.reset().dim('required (XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)')}`,
        format: toUndefinedIfEmpty,
        validate: is(AwsSecretAccessKey)
      },
      {
        type: 'text' as const,
        name: 'mfaDevice' as const,
        message: `MFA Device Serial or ARN ${kleur.reset().dim('normally optional, but required for MFA (device serial) or (arn:aws:iam::############:mfa/user)')}`,
        format: toUndefinedIfEmpty,
        validate: isEmptyOr(AwsMfaDevice)
      },
      {
        type: prev => AwsMfaDevice.safeParse(prev).success ? 'password' : undefined,
        name: 'mfaKey' as const,
        message: `MFA Source Key ${kleur.reset().dim('optional, provide to auto-fill MFA one-time passwords')}`,
        format: toUndefinedIfEmpty,
        validate: isEmptyOr(Base32)
      }
    ],
    {
      onCancel: (): never => {
        throw new CancelError()
      }
    }))

    const config = await awsConfig.getConfig()
    const originalProfileConfig = awsConfig.getProfile(config, profileKey)
    const command = profile != null && profile.length > 0
      ? `"${program.filePath}" session --profile ${profile}`
      : `"${program.filePath}" session`

    const profileConfig = { ...originalProfileConfig, credential_process: command }

    await awsConfig.updateProfile(config, profileKey, profileConfig)
    await keyRing.storeCredentials(profileKey, credentials)

    logger.info(originalProfileConfig == null ? `[${profileKey}] created` : `[${profileKey}] updated`)
  })

function is<Schema extends z.ZodType> (schema: Schema): (value: unknown) => boolean {
  return value => schema.safeParse(value).success
}

function isEmptyOr<Schema extends z.ZodType> (schema: Schema): (value: unknown) => boolean {
  return value => value == null || String(value).length === 0 || schema.safeParse(value).success
}
