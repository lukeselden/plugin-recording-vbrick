import { plugin } from './plugin.js'

export interface ConferenceMeta {
  conferenceAlias: string
  conferenceName?: string
}
export let conferenceMeta: ConferenceMeta = {
  conferenceAlias: '',
  conferenceName: undefined
}

export const setConferenceMeta = (
  conferenceAlias: string,
  conferenceName?: string
): void => {
  conferenceMeta = { conferenceAlias, conferenceName }
}

export const toggleRecordingIndicator = async (
  isRecording: boolean
): Promise<void> => {
  await plugin.conference.setLayout({
    transforms: { recording_indicator: isRecording }
  })
}

export const disablePINCheck = async (
  participantUuid: string
): Promise<void> => {
  try {
    // With this we avoid having to pass the PIN (host or guest) to Vbrick
    await plugin.conference.setRole({
      role: 'chair',
      participantUuid
    })
    await plugin.conference.setRole({
      role: 'guest',
      participantUuid
    })
  } catch (error) {
    // fails if participant failed to connect
  }
}
