import keytar from 'keytar'
import v from 'vahvista'
import type { AwsCredentialPayload } from './aws'
import { isAwsAccessKeyId, isAwsCredentialPayload, isAwsMfaDevice, isAwsSecretAccessKey } from './aws'
import { validate } from './validation'

export const kBase32Pattern = /^[A-Z2-7=]+$/u

export const isBase32 = v.matches(kBase32Pattern)

export type StoredCredentials =
  { keyId: string, secretKey: string, mfaDevice: undefined, mfaKey: undefined } |
  { keyId: string, secretKey: string, mfaDevice: string, mfaKey: string }

export const isStoredCredentials = v.or(
  v.shape({
    keyId: isAwsAccessKeyId,
    secretKey: isAwsSecretAccessKey,
    mfaDevice: isAwsMfaDevice,
    mfaKey: isBase32
  }),
  v.shape({
    keyId: isAwsAccessKeyId,
    secretKey: isAwsSecretAccessKey
  })
)

const keyRing = {
  getCredentials: async (profileKey: string): Promise<null | StoredCredentials> => {
    const data = await keytar.getPassword('@aws', profileKey)
    if (data == null) {
      return null
    }

    const credentials = JSON.parse(data) as null | Partial<StoredCredentials>
    if (!isStoredCredentials(credentials)) {
      console.error(`Data from @aws/session/${profileKey} is not our stored access key data`)
      console.error(`Got "${data}"`)

      return null
    }

    return credentials as StoredCredentials
  },
  storeCredentials: async (profileKey: string, credentials: StoredCredentials): Promise<void> => {
    // HACK: Some key-rings won't replace an existing entry, such as GNOME keyring.
    await keytar.deletePassword('@aws', profileKey)

    await keytar.setPassword('@aws', profileKey, JSON.stringify(credentials))
  },
  getSessionToken: async (profileKey: string): Promise<null | AwsCredentialPayload> => {
    const data = await keytar.getPassword('@aws/session', profileKey)
    if (data == null) {
      return null
    }

    const credentials = JSON.parse(data)
    if (!isAwsCredentialPayload(credentials)) {
      console.error(`Data from @aws/session/${profileKey} is not our AWS session key payload`)
      console.error(`Got "${data}"`)

      return null
    }

    if (Date.parse(credentials.Expiration) <= Date.now()) {
      console.error('Sesssion expired')

      return null
    }

    return credentials
  },
  cacheSessionToken: async (profileKey: string, payload: AwsCredentialPayload) => {
    validate(isAwsCredentialPayload, { payload }, 'must be a valid stored credentials object')

    // HACK: Some key-rings won't replace an existing entry, such as GNOME keyring.
    await keytar.deletePassword('@aws/session', profileKey)

    await keytar.setPassword('@aws/session', profileKey, JSON.stringify(payload))
  }
}

export default keyRing
