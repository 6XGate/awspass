import { constants as fs } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { DateTime } from 'luxon'
import spdxLicenseList from 'spdx-license-list'
import v from 'vahvista'
import type { PredicateType } from '../helpers/types'
import type { PackageJson, Simplify } from 'type-fest'

let currentPackage: null | Program = null

const isBrandedPackage = v.shape({
  name: v.string.notEmpty,
  version: v.string.notEmpty,
  description: v.string.notEmpty,
  license: v.string.notEmpty,
  author: v.or(v.string.notEmpty, v.shape({
    name: v.string.notEmpty,
    url: v.or(v.undefined, v.url),
    email: v.or(v.undefined, v.email)
  }))
})

type PackageInfo = Simplify<PredicateType<typeof isBrandedPackage> & PackageJson>

export class Package {
  package: PackageInfo

  protected constructor (info: PackageInfo) {
    this.package = info
  }

  static async readPackage (path: string): Promise<Package> {
    return new Package(await Package.readPackageData(path))
  }

  protected static async readPackageData (path: string): Promise<PackageInfo> {
    const packageFile: unknown = JSON.parse(await readFile(path, { encoding: 'utf-8' }))
    if (!isBrandedPackage(packageFile)) {
      throw new ReferenceError('Package information must contain at least name, version, description, author, and license')
    }

    return packageFile
  }

  get name (): string {
    return this.package.name
  }

  get version (): string {
    return this.package.version
  }

  get description (): string {
    return this.package.description
  }

  get licenseId (): string {
    return this.package.license
  }

  get license (): string {
    return this.licenseId in spdxLicenseList
      ? spdxLicenseList[this.licenseId].name
      : this.licenseId
  }

  get licenseUrl (): string | undefined {
    return this.licenseId in spdxLicenseList
      ? spdxLicenseList[this.licenseId].url
      : undefined
  }

  get isFree (): boolean {
    return this.licenseId in spdxLicenseList
      ? spdxLicenseList[this.licenseId].osiApproved
      : false
  }

  get authors (): string {
    return typeof this.package.author === 'object'
      ? this.package.author.name
      : this.package.author
  }
}

async function findPackageInfo (): Promise<string> {
  let path = __dirname
  let previous: string | undefined
  while (path !== previous) {
    const maybe = resolve(path, 'package.json')
    if (await access(maybe, fs.R_OK).then(() => true).catch(() => false)) {
      return maybe
    }

    previous = path
    path = resolve(path, '..')
  }

  throw new ReferenceError('No package.json exists for the running program')
}

export class Program extends Package {
  private constructor (info: PackageInfo, copyrightStartsIn: number) {
    super(info)
  }

  static async readCurrent (copyrightStartsIn: number): Promise<Program> {
    if (currentPackage != null) {
      return currentPackage
    }

    const packageInfo = await Package.readPackageData(await findPackageInfo())
    currentPackage = new Program(packageInfo, copyrightStartsIn)

    return currentPackage
  }

  get filePath (): string {
    // HACK: Uses __filename since this program will be bundled program.
    return __filename
  }

  get baseFileName (): string {
    return basename(this.filePath)
  }

  get baseName (): string {
    return basename(this.name)
  }

  get copyrightRange (): string {
    const now = DateTime.now().year

    return kStartDate !== now
      ? [kStartDate, now].join('-')
      : String(kStartDate)
  }
}

const kStartDate = 2022

const program = await Program.readCurrent(kStartDate)

export default program
