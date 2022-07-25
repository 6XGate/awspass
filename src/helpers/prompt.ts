import { execa } from 'execa'
import which from 'which'
import { CancelError } from '../core/system'

// TODO: function promptMac (cmd, instructions, title)
// TODO: function promptKDialog (cmd, instructions, title)

const kCommands = {
  // Windows
  // TODO: async cscript: (cmd, instructions, title) => ...,
  // macOS
  // TODO: async osascript: (cmd, instructions, title) => ...,
  // GNOME/Zenity
  zenity: async (binary: string, instructions: string, title: string): Promise<string> => {
    const { stdout } = await execa(binary, ['--entry', '--text', instructions, '--title', title], { stderr: 'inherit' })
      .catch(error => {
        if (error.exitCode === 1) {
          throw new CancelError()
        } else {
          throw error
        }
      })

    return stdout
  }
  // KDE: KDialog
  // kdialog: async osascript: (cmd, instructions, title) => ...,
}

export async function prompt (instructions: string, title = 'NodeJS'): Promise<string> {
  for (const [cmd, prompter] of Object.entries(kCommands)) {
    const binary = await which(cmd).catch(() => undefined)
    if (binary != null) {
      return await prompter(binary, instructions, title)
    }
  }

  throw new ReferenceError('No way to prompt user for MFA code, install Zenity or KDialog')
}
