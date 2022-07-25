import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import ini from 'ini'
import v from 'vahvista'
import { resolvePath } from './path'
import type { CommonOptions } from '../cli/common'
import type { PredicateType } from './types'
import type { Predicate } from 'vahvista'

export interface BaseConfigSection { [P: string]: string | Partial<BaseConfigSection> }

export type ConfigSection = Partial<BaseConfigSection>

export const kAwsAccessKeyIdPattern = /^(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])$/u
export const kAwsSecretAccessKeyPattern = /^(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])$/u
export const kAwsMfaDevicePattern = /^[\w+=/:,.@-]+$/u

export const isAwsAccessKeyId = v.string.matches(kAwsAccessKeyIdPattern)
export const isAwsSecretAccessKey = v.string.matches(kAwsSecretAccessKeyPattern)
export const isAwsMfaDevice = v.string.matches(kAwsMfaDevicePattern)

export const isAwsCredentialPayload = v.shape({
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- It does, from Predicate<number> to Predicate<1>
  Version: v.equal(1) as Predicate<1>,
  AccessKeyId: isAwsAccessKeyId,
  SecretAccessKey: isAwsSecretAccessKey,
  SessionToken: v.string.notEmpty,
  Expiration: v.dateLike
})

export type AwsCredentialPayload = PredicateType<typeof isAwsCredentialPayload>

export const isAwsStsResponseCredentials = v.shape({
  AccessKeyId: isAwsAccessKeyId,
  SecretAccessKey: isAwsSecretAccessKey,
  SessionToken: v.string.notEmpty,
  Expiration: v.date
})

export class AwsConfig {
  configFilePath = process.env.AWS_CONFIG_FILE != null && process.env.AWS_CONFIG_FILE.length > 0
    ? resolvePath(process.env.AWS_CONFIG_FILE)
    : resolve(homedir(), '.aws', 'config')

  async getConfig (): Promise<ConfigSection> {
    try {
      const config = await fs.readFile(this.configFilePath, 'utf-8')

      return ini.parse(config)
    } catch (error) {
      return {}
    }
  }

  getProfile (config: ConfigSection, profileKey: string): null | ConfigSection {
    return (config[profileKey] ?? null) as null | ConfigSection
  }

  async updateProfile (config: ConfigSection, profileKey: string, profileConfig: ConfigSection = {}): Promise<void> {
    config[profileKey] = profileConfig

    await fs.writeFile(this.configFilePath, ini.stringify(config))
  }
}

export const awsConfig = new AwsConfig()

export function getAwsProfileKey (options?: CommonOptions): string {
  if (options?.profile == null || options.profile.length === 0) {
    return 'default'
  }

  return `profile ${options.profile}`
}

export async function getAwsRegion (options?: CommonOptions): Promise<undefined | string> {
  if (options?.region != null && options.region.length > 0) {
    return options.region
  }

  const profileKey = getAwsProfileKey(options)
  const config = await awsConfig.getConfig()
  let profileConfig = config[profileKey]
  if (typeof profileConfig === 'object' && typeof profileConfig.region === 'string') {
    return profileConfig.region
  }

  profileConfig = config.default
  if (typeof profileConfig === 'object' && typeof profileConfig.region === 'string') {
    return profileConfig.region
  }

  return process.env.AWS_DEFAULT_REGION
}
