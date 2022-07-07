import { promises as fs } from 'fs'
import ini from 'ini'
import os from 'os'
import { normalize, resolve } from 'path'
import v, { Predicate } from 'vahvista'

export interface AwsCredentialPayload {
  Version: 1
  AccessKeyId: string
  SecretAccessKey: string
  SessionToken: string
  Expiration: string
}

export interface BaseConfigSection {[P: string]: string | Partial<BaseConfigSection>}

export type ConfigSection = Partial<BaseConfigSection>

export const kAwsAccessKeyIdPattern = /^(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])$/u
export const kAwsSecretAccessKeyPattern = /^(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])$/u
export const kAwsMfaDevicePattern = /^[\w+=/:,.@-]+$/u

export const isAwsAccessKeyId = v.matches(kAwsAccessKeyIdPattern)
export const isAwsSecretAccessKey = v.matches(kAwsSecretAccessKeyPattern)
export const isAwsMfaDevice = v.matches(kAwsMfaDevicePattern)

export const isAwsCredentialPayload = v.shape({
  Version: v.equal(1) as Predicate<1>,
  AccessKeyId: isAwsAccessKeyId,
  SecretAccessKey: isAwsSecretAccessKey,
  SessionToken: v.string.notEmpty,
  Expiration: v.dateLike
})

export const isAwsStsResponseCredentials = v.shape({
  AccessKeyId: isAwsAccessKeyId,
  SecretAccessKey: isAwsSecretAccessKey,
  SessionToken: v.string.notEmpty,
  Expiration: v.date
})

export const awsConfig = {
  getConfig: async (): Promise<ConfigSection> => {
    try {
      const path = normalize(resolve(os.homedir(), '.aws', 'config'))
      const config = await fs.readFile(path, 'utf-8')

      return ini.parse(config) ?? {}
    } catch (error) {
      return {}
    }
  },

  getProfile: (config: ConfigSection, profileKey: string): null | ConfigSection => {
    return (config[profileKey] ?? null) as null | ConfigSection
  },

  updateProfile: async (config: ConfigSection, profileKey: string, profileConfig: ConfigSection = {}): Promise<void> => {
    const path = normalize(resolve(os.homedir(), '.aws', 'config'))

    config[profileKey] = profileConfig

    await fs.writeFile(path, ini.stringify(config))
  }
}

export function getAwsProfileKey (profile: undefined | string): string {
  if (profile == null || profile.length === 0) {
    return 'default'
  }

  return `profile ${profile}`
}

export async function getAwsRegion (profile: undefined | string): Promise<undefined | string> {
  const region = process.env['AWS_REGION']
  if (region != null) {
    return region
  }

  const profileKey = getAwsProfileKey(profile)
  const config = await awsConfig.getConfig()
  let profileConfig = config[profileKey]
  if (typeof profileConfig === 'object' && typeof profileConfig?.region === 'string') {
    return profileConfig.region
  }

  profileConfig = config.default
  if (typeof profileConfig === 'object' && typeof profileConfig?.region === 'string') {
    return profileConfig.region
  }

  return undefined
}
