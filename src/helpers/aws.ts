import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import ini from 'ini'
import z from 'zod'
import { Paths } from './path'
import { DateString } from './validation'
import type { CommonOptions } from '../cli/common'

export interface BaseConfigSection { [P: string]: string | Partial<BaseConfigSection> }

export type ConfigSection = Partial<BaseConfigSection>

export const kAwsAccessKeyIdPattern = /^(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])$/u
export const kAwsSecretAccessKeyPattern = /^(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])$/u
export const kAwsMfaDevicePattern = /^[\w+=/:,.@-]+$/u

export type AwsAccessKeyId = z.infer<typeof AwsAccessKeyId>
export const AwsAccessKeyId = z.string().regex(kAwsAccessKeyIdPattern)

export type AwsSecretAccessKey = z.infer<typeof AwsSecretAccessKey>
export const AwsSecretAccessKey = z.string().regex(kAwsSecretAccessKeyPattern)

export type AwsMfaDevice = z.infer<typeof AwsMfaDevice>
export const AwsMfaDevice = z.string().regex(kAwsMfaDevicePattern)

export type AwsCredentialPayload = z.infer<typeof AwsCredentialPayload>
export const AwsCredentialPayload = z.object({
  Version: z.literal(1),
  AccessKeyId: AwsAccessKeyId,
  SecretAccessKey: AwsSecretAccessKey,
  SessionToken: z.string().min(1),
  Expiration: DateString
})

export type AwsStsResponseCredentials = z.infer<typeof AwsStsResponseCredentials>
export const AwsStsResponseCredentials = z.object({
  AccessKeyId: AwsAccessKeyId,
  SecretAccessKey: AwsSecretAccessKey,
  SessionToken: z.string().min(1),
  Expiration: z.date()
})

export class AwsConfig {
  configFilePath = process.env.AWS_CONFIG_FILE != null && process.env.AWS_CONFIG_FILE.length > 0
    ? Paths.prepare(process.env.AWS_CONFIG_FILE)
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

export function getAwsProfileKey (options: null | CommonOptions = null): string {
  if (options?.profile == null || options.profile.length === 0) {
    return 'default'
  }

  return `profile ${options.profile}`
}
