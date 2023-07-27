import { GetSessionTokenCommand, STSClient } from '@aws-sdk/client-sts'
import totp from 'totp-generator'
import { getAwsProfileKey, AwsStsResponseCredentials } from '../helpers/aws'
import { prompt } from '../helpers/prompt'
import keyRing from './key-ring'
import type { CommonOptions } from '../cli/common'
import type { AwsCredentialPayload } from '../helpers/aws'
import type { DateString } from '../helpers/validation'

export const kEnvNames: Record<string, string> = {
  AccessKeyId: 'AWS_ACCESS_KEY_ID',
  SecretAccessKey: 'AWS_SECRET_ACCESS_KEY',
  SessionToken: 'AWS_SESSION_TOKEN',
  Expiration: 'AWS_SESSION_EXPIRATION'
}

async function getOtp (key?: string, options: null | CommonOptions = null): Promise<string> {
  return key != null ? totp(key) : await prompt('One-time password:', 'AWSPass', options)
}

export async function login (options: null | CommonOptions = null): Promise<AwsCredentialPayload> {
  const profileKey = getAwsProfileKey(options)
  const session = await keyRing.getSessionToken(profileKey)
  if (session != null) {
    // Using the cached session
    return session
  }

  const credentials = await keyRing.getCredentials(profileKey)
  if (credentials == null) {
    throw new ReferenceError('No credentials have been set up')
  }

  const client = new STSClient({
    credentials: { accessKeyId: credentials.keyId, secretAccessKey: credentials.secretKey },
    region: options?.region
  })

  const code = credentials.mfaDevice != null
    ? await getOtp(credentials.mfaKey, options)
    : undefined
  const command = new GetSessionTokenCommand({
    DurationSeconds: 900,
    SerialNumber: credentials.mfaDevice,
    TokenCode: code
  })

  const response = await client.send(command)
  const httpStatus = response.$metadata.httpStatusCode ?? 200
  if (!(200 <= httpStatus && httpStatus < 400)) {
    throw new Error(`HTTP ${httpStatus}`)
  }

  const token = AwsStsResponseCredentials.parse(response.Credentials)
  // if (AwsStsResponseCredentials.parse(response.Credentials)) {
  //   throw new TypeError('Credentials not returned')
  // }

  const payload: AwsCredentialPayload = {
    Version: 1,
    AccessKeyId: token.AccessKeyId,
    SecretAccessKey: token.SecretAccessKey,
    SessionToken: token.SessionToken,
    Expiration: token.Expiration.toISOString() as DateString
  }

  await keyRing.cacheSessionToken(profileKey, payload)

  return payload
}
