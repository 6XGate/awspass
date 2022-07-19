import { basename } from 'node:path'
import { oneLineCommaListsAnd } from 'common-tags'
import { DateTime } from 'luxon'
import spdxLicenseList from 'spdx-license-list'
import packageInfo from '../../package.json'

const kStartDate = 2022

export const program = {
  get filePath (): string {
    // HACK: Uses __filename since this program will be bundled program.
    return __filename
  },
  get name (): string {
    // HACK: Uses __filename since this program will be bundled program.
    // Don't rely on packageInfo for this since must match the program file name.
    return basename(__filename)
  },
  get version (): string {
    return packageInfo.version
  },
  get description (): string {
    return packageInfo.description
  },
  get license (): string {
    return packageInfo.license in spdxLicenseList
      ? spdxLicenseList[packageInfo.license].name
      : packageInfo.license
  },
  get licenseUrl (): string | undefined {
    return packageInfo.license in spdxLicenseList
      ? spdxLicenseList[packageInfo.license].url
      : undefined
  },
  get isFree (): boolean {
    return packageInfo.license in spdxLicenseList
      ? spdxLicenseList[packageInfo.license].osiApproved
      : false
  },
  get authors (): string {
    return oneLineCommaListsAnd`${packageInfo.author}`
  },
  get copyrightRange (): string {
    const now = DateTime.now().year

    return kStartDate !== now
      ? [kStartDate, now].join('-')
      : String(kStartDate)
  }
}
