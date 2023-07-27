import { platform } from 'node:os'
import { execa } from 'execa'
import prompts from 'prompts'
import whichInner from 'which'
import logger from '../core/logger'
import { CancelError } from '../core/system'
import { compose } from './compose'
import type { CommonOptions, PromptTool } from '../cli/common'

// Some well-known desktop environment
const kGtkDesktops = ['GNOME', 'GNOME-FLASHBACK', 'GNOME-CLASSIC', 'XFCE', 'CINNAMON', 'MATE', 'LXDE', 'BUDGIE', 'ROX', 'UNITY', 'PANTHEON'] as const
const kQtDesktops = ['KDE', 'LXQT', 'RAZOR', 'TDE'] as const
// const kUniqueDesktops = ['EDE'] as const

type WeightGetter = (options: null | CommonOptions) => number
type Prompter = (program: string, instructions: string, title: string) => Promise<string>

interface PrompterInfo<K extends PromptTool> {
  name: K
  cmd: string
  installable: boolean
  weight: WeightGetter
  prompter: Prompter
}

type PrompterSystem = { [K in PromptTool]: PrompterInfo<K> }

// Which that doesn't throw
const which = async (cmd: string): Promise<string> => await whichInner(cmd).catch(() => '')

// Run a command
const run = async (cmd: string, args: string[], cancelCodes = [1]): Promise<string> => {
  const { stdout } = await execa(cmd, args, { stderr: 'inherit' })
    .catch(error => { throw cancelCodes.includes(error.exitCode) ? new CancelError() : error })

  return stdout
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Must deduce
const weight = () => {
  const kSessionDesktop = process.env.XDG_SESSION_DESKTOP?.toUpperCase() ?? ''

  // Weight settings
  const kUserChoiceWeight = 20
  const kOsSpecificWeight = 8
  const kKeepWeight = 1
  const kSecureWeight = 1

  return compose({
    call (options: null | CommonOptions) {
      return this.checks.reduce(
        (weight, check): number => { return weight + check(options) },
        0
      )
    },
    data: {
      checks: [] as Array<(option: null | CommonOptions) => number>
    },
    methods: {
      if (expr: boolean | ((option: null | CommonOptions) => boolean), weight = 1) {
        typeof expr === 'function'
          ? this.checks.push(options => expr(options) ? weight : 0)
          : this.checks.push(expr ? () => weight : () => 0)

        return this
      },
      isSecure () {
        this.checks.push(() => kSecureWeight)

        return this
      },
      keep () {
        this.checks.push(() => kKeepWeight)

        return this
      },
      forOs (os: NodeJS.Platform, preference = 0) {
        return this.if(platform() === os, kOsSpecificWeight + preference)
      },
      forDesktop (set: readonly string[], preference = 0) {
        return this.if(set.includes(kSessionDesktop), kOsSpecificWeight + preference)
      },
      chose (tool: PromptTool) {
        this.checks.push(options => options?.prompt === tool ? kUserChoiceWeight : 0)

        return this
      }
    }
  })
}

const kIsWindows = platform() === 'win32'
const kIsMac = platform() === 'darwin'
const kIsPlainPosix = !kIsWindows && !kIsMac

const kPrompters: PrompterSystem = {
  // TODO: Windows
  cscript: {
    name: 'cscript',
    cmd: await which('cscript'),
    installable: kIsWindows,
    weight: weight().forOs('win32'),
    prompter: () => { throw new Error('Windows not yet suported') }
  },
  // TODO: macOS
  osascript: {
    name: 'osascript',
    cmd: await which('osascript'),
    installable: kIsMac,
    weight: weight().forOs('darwin'),
    prompter: () => { throw new Error('macOS not yet suported') }
  },
  // QT
  kdialog: {
    name: 'kdialog',
    cmd: await which('kdialog'),
    installable: kIsPlainPosix,
    weight: weight().keep().forDesktop(kQtDesktops).chose('kdialog'),
    prompter: async (program, instructions, title) =>
      await run(program, ['--inputbox', instructions, '--title', title])
  },
  // GTK
  zenity: {
    name: 'zenity',
    cmd: await which('zenity'),
    installable: kIsPlainPosix,
    weight: weight().isSecure().keep().forDesktop(kGtkDesktops).chose('zenity'),
    // weight(options).isSecure().keep().forDesktop(kQtDesktops).chose('zenity').weight
    prompter: async (program, instructions, title) =>
      await run(program, ['--entry', '--text', instructions, '--title', title, '--hide-text'])
  },
  yad: {
    name: 'yad',
    cmd: await which('yad'),
    installable: kIsPlainPosix,
    weight: weight().isSecure().keep().forDesktop(kGtkDesktops, -1).chose('yad'),
    prompter: async (program, instructions, title) =>
      await run(program, ['--entry', '--entry-label', instructions, '--title', title, '--hide-text'], [1, 70, 252])
  },
  // Terminal
  terminal: {
    name: 'terminal',
    cmd: 'terminal',
    installable: false,
    weight: weight().if(options => options?.terminal === true).chose('terminal'),
    prompter: async (_program, instructions, _title) => {
      const response = await prompts([
        {
          type: 'text' as const,
          name: 'otp' as const,
          message: instructions,
          format: toUndefinedIfEmpty,
          validate: (value: unknown) => value != null && String(value).length > 0,
          stdout: process.stderr
        }
      ],
      {
        onCancel: (): never => {
          throw new CancelError()
        }
      })

      return String(response.otp)
    }
  }
}

const kInstallableTools = Object.entries(kPrompters).filter(([, info]) => info.installable).map(([tool]) => tool)

export async function prompt (instructions: string, title = 'NodeJS', options: null | CommonOptions = null): Promise<string> {
  const info = Object.values(kPrompters)
    // Remove any prompts not available
    .filter(({ cmd }) => cmd.length > 0)
    // Sort based on calculated weight
    .sort(({ weight: left }, { weight: right }) => left(options) - right(options))
    // Now grab the last entry
    .pop()

  if (info == null) {
    throw new ReferenceError(
      `No way to prompt user for MFA code, install one of the following:\n    ${kInstallableTools.join(', ')}`
    )
  }

  if (options?.prompt != null && options.prompt !== info.name) {
    logger.warn(`${options.prompt} not available, using next avaible option ${info.name}`)
  }

  return await info.prompter(info.cmd, instructions, title)
}

export function toUndefinedIfEmpty (value: string): undefined | string {
  return value.length === 0 ? undefined : value
}
