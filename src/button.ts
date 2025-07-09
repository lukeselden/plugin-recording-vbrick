import { Recording } from './recording'
import type {
  Button,
  GroupButtonPayload,
  RPCCallPayload
} from '@pexip/plugin-api'
import { plugin } from './plugin'
import { showLogoutPrompt } from './prompts'
import { Auth } from './auth'
import { config } from './config'

const baseButtonPayload: RPCCallPayload<'ui:button:add'> = {
  position: 'toolbar',
  icon: 'IconLiveStream',
  tooltip: 'Recordings',
  roles: ['chair']
}

enum ButtonId {
  Login = 'login-button',
  Logout = 'logout-button',
  Start = 'start-button',
  Stop = 'stop-button',
  Videos = 'videos-button'
}

let button: Button<'toolbar'>

const authPopUpId = 'pexip-vbrick-auth'
const videosPopUpId = 'pexip-vbrick-videos'
const popUpOpts =
  'toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0,width=500,height=500,left=600,top=250'

export const initButton = async (): Promise<void> => {
  button = await plugin.ui.addButton(baseButtonPayload)
  button.onClick.add(handleClickGroup)
}

export const updateButton = async (): Promise<void> => {
  await button.update({
    ...baseButtonPayload,
    isActive: Recording.isRecording(),
    group: await getGroup()
  })
}

const getGroup = async (): Promise<GroupButtonPayload[]> => {
  const url = await Auth.getAuthUrl()
  if (!Auth.isAuthenticated()) {
    return [
      {
        id: ButtonId.Login,
        icon: 'IconLeave',
        tooltip: 'Log in',
        roles: ['chair'],
        opensPopup: {
          id: authPopUpId,
          openParams: [url, '', popUpOpts]
        }
      }
    ]
  }

  const group: GroupButtonPayload[] = []

  group.push(
    Recording.isRecording()
      ? {
          id: ButtonId.Stop,
          icon: 'IconStopRound',
          tooltip: 'Stop recording',
          roles: ['chair'],
          isActive: true
        }
      : {
          id: ButtonId.Start,
          icon: 'IconPlayRound',
          tooltip: 'Start recording',
          roles: ['chair']
        },
    {
      id: ButtonId.Videos,
      icon: 'IconOpenInNew',
      tooltip: 'Manage recordings',
      roles: ['chair'],
      opensPopup: {
        id: videosPopUpId,
        openParams: [
          config.vbrick.url + '/#/media/uploads?sortField=whenUploaded',
          '',
          popUpOpts
        ]
      }
    },
    {
      id: ButtonId.Logout,
      icon: 'IconLeave',
      tooltip: 'Log out',
      roles: ['chair']
    }
  )

  return group
}

const handleClickGroup = ({ buttonId }: { buttonId: string }): void => {
  switch (buttonId as ButtonId) {
    case ButtonId.Login: {
      focusPopUp(authPopUpId)
      break
    }
    case ButtonId.Logout: {
      showLogoutPrompt().catch(console.error)
      break
    }
    case ButtonId.Start: {
      Recording.startRecording().catch(console.error)
      break
    }
    case ButtonId.Stop: {
      Recording.stopRecording().catch(console.error)
      break
    }
    case ButtonId.Videos: {
      focusPopUp(videosPopUpId)
      break
    }
  }
}

const focusPopUp = (id: string): void => {
  setTimeout(() => {
    window.plugin.popupManager.get(id)?.focus()
  }, 0)
}
