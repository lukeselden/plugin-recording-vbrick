import { Auth } from './auth'
import { plugin } from './plugin'

export const showLogoutPrompt = async (): Promise<void> => {
  const primaryAction = 'Log out'
  const prompt = await plugin.ui.addPrompt({
    title: 'Log out',
    description: 'Do you want to log out from Vbrick?',
    prompt: {
      primaryAction,
      secondaryAction: 'Cancel'
    }
  })

  prompt.onInput.add(async (value) => {
    await prompt.remove()
    if (value === primaryAction) {
      await Auth.logout()
    }
  })
}
