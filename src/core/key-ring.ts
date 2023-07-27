import keytar from 'keytar'
import z from 'zod'
import logger from '../core/logger'
import { AwsAccessKeyId, AwsMfaDevice, AwsSecretAccessKey, AwsCredentialPayload } from '../helpers/aws'

export const kBase32Pattern = /^[A-Z2-7=]+$/u

export const Base32 = z.string().regex(kBase32Pattern)

export type StoredCredentials = z.infer<typeof StoredCredentials>
export const StoredCredentials = z.object({
  keyId: AwsAccessKeyId,
  secretKey: AwsSecretAccessKey,
  mfaDevice: AwsMfaDevice,
  mfaKey: Base32
}).or(z.object({
  keyId: AwsAccessKeyId,
  secretKey: AwsSecretAccessKey,
  mfaDevice: AwsMfaDevice,
  mfaKey: z.undefined()
})).or(z.object({
  keyId: AwsAccessKeyId,
  secretKey: AwsSecretAccessKey,
  mfaDevice: z.undefined(),
  mfaKey: z.undefined()
}))

export class KeyRing {
  async getCredentials (profileKey: string): Promise<null | StoredCredentials> {
    const data = await keytar.getPassword('@aws', profileKey)
    if (data == null) {
      return null
    }

    const parsed = StoredCredentials.safeParse(JSON.parse(data))
    if (!parsed.success) {
      logger.error(parsed.error)

      return null
    }

    return parsed.data
  }

  async storeCredentials (profileKey: string, credentials: StoredCredentials): Promise<void> {
    // HACK: Some key-rings won't replace an existing entry, such as GNOME keyring.
    await keytar.deletePassword('@aws', profileKey)

    await keytar.setPassword('@aws', profileKey, JSON.stringify(credentials))
  }

  async getSessionToken (profileKey: string): Promise<null | AwsCredentialPayload> {
    const data = await keytar.getPassword('@aws/session', profileKey)
    if (data == null) {
      return null
    }

    const parsed = AwsCredentialPayload.safeParse(JSON.parse(data))
    if (!parsed.success) {
      logger.error(parsed.error)

      return null
    }

    const credentials = parsed.data
    if (Date.parse(credentials.Expiration) <= Date.now()) {
      logger.warn('Sesssion expired')

      return null
    }

    return credentials
  }

  async cacheSessionToken (profileKey: string, payload: AwsCredentialPayload): Promise<void> {
    // HACK: Some key-rings won't replace an existing entry, such as GNOME keyring.
    await keytar.deletePassword('@aws/session', profileKey)

    await keytar.setPassword('@aws/session', profileKey, JSON.stringify(payload))
  }
}

const keyRing = new KeyRing()

export default keyRing
