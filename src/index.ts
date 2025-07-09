import { registerPlugin } from '@pexip/plugin-api'
import { initButton, updateButton } from './button'
import { Auth } from './auth'
import { Recording } from './recording'
import { setPlugin } from './plugin'
import { setConferenceMeta } from './conferenceAlias'

const plugin = await registerPlugin({
  id: 'plugin-recording-vbrick',
  version: 0
})

setPlugin(plugin)

Recording.init()

await initButton()


plugin.events.authenticatedWithConference.add((conference) => {
  setConferenceMeta(conference.conferenceAlias, conference.conferenceName)
})

Auth.emitter.on('login', () => {
  updateButton().catch(console.error)
  plugin.ui.showToast({ message: 'Logged into Vbrick' }).catch(console.error)
})

Auth.emitter.on('refreshed_token', () => {
  updateButton().catch(console.error)
})

Auth.emitter.on('logout', () => {
  updateButton().catch(console.error)
  plugin.ui
    .showToast({ message: 'Logged out from Vbrick' })
    .catch(console.error)
})

Recording.emitter.on('changed', () => {
  updateButton().catch(console.error)
})

if (await Auth.isSessionValid()) {
  await Auth.refreshAccessToken()
} else {
  Auth.cleanSession()
  await updateButton()
}
