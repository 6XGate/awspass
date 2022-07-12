import { GetSessionTokenCommand, STSClient } from '@aws-sdk/client-sts'
import totp from 'totp-generator'
import type { AwsCredentialPayload } from '../utils/aws'
import { getAwsProfileKey, getAwsRegion, isAwsStsResponseCredentials } from '../utils/aws'
import keyRing from '../utils/key-ring'

export default async function getSession (profile: undefined | string): Promise<void> {
  const region = await getAwsRegion(profile)
  if (region == null) {
    throw new ReferenceError('No region is set')
  }

  const profileKey = getAwsProfileKey(profile)
  const session = await keyRing.getSessionToken(profileKey)
  if (session != null) {
    console.log(JSON.stringify(session, null, 2))

    // Using the cached session
    return
  }

  const credentials = await keyRing.getCredentials(profileKey)
  if (credentials == null) {
    throw new ReferenceError('No credentials have been set up')
  }

  const client = new STSClient({
    credentials: { accessKeyId: credentials.keyId, secretAccessKey: credentials.secretKey },
    region
  })

  const code = credentials.mfaKey != null ? totp(credentials.mfaKey) : undefined
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

  if (!isAwsStsResponseCredentials(response.Credentials)) {
    throw new TypeError('Credentials not returned')
  }

  const payload: AwsCredentialPayload = {
    Version: 1,
    AccessKeyId: response.Credentials.AccessKeyId,
    SecretAccessKey: response.Credentials.SecretAccessKey,
    SessionToken: response.Credentials.SessionToken,
    Expiration: response.Credentials.Expiration.toISOString()
  }

  await keyRing.cacheSessionToken(profileKey, payload)
  console.log(JSON.stringify(payload, null, 2))
}
