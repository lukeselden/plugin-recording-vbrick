import EventEmitter from 'eventemitter3'
import { config } from './config'
import { getPlugin } from './plugin'
import { getConferenceAlias } from './conferenceAlias'
import { initButtonGroup } from './buttons/button'
import type { InfinityParticipant } from '@pexip/plugin-api'
import { vcRecordingApi } from './vc-recording'
import { clearRecording, getRecording, setRecording, isRecording } from './vbrick/recordingState'
import { RecordingApi } from './vbrick/contracts'

let participants: InfinityParticipant[]

const recordingApi: RecordingApi = vcRecordingApi;

const init = (): void => {
  const plugin = getPlugin()

  // Initialize the videoId at the beginning of the conference
  plugin.events.authenticatedWithConference.add(() => {
    clearRecording()
  })

  plugin.events.participantJoined.add(async (event) => {
    if (recordingApi.isRecordingParticipant(event.participant)) {
      (plugin.conference as any).sendRequest({
        path: 'transform_layout',
        method: 'POST',
        payload: {
          transforms: {
            recording_indicator: true
          }
        }
      })
      // With this we avoid having to pass the PIN (host or guest) to Vbrick
      await plugin.conference.setRole({ role: 'chair', participantUuid: event.participant.uuid })
      await plugin.conference.setRole({ role: 'guest', participantUuid: event.participant.uuid })
    }
  })

  plugin.events.participantLeft.add((event) => {
    if (recordingApi.isRecordingParticipant(event.participant)) {
      (plugin.conference as any).sendRequest({
        path: 'transform_layout',
        method: 'POST',
        payload: {
          transforms: {
            recording_indicator: false
          }
        }
      })
    }
  })

  // Check if we were recording before. This way we can recover the state in
  // case the user reload the page
  plugin.events.participants.add(async (event) => {
    participants = event.participants
  })

  plugin.events.participantLeft.add(async (event) => {
    const participant = event.participant
    if (recordingApi.isRecordingParticipant(participant)) {
      clearRecording();
      await initButtonGroup()
    }
  })
}

const startRecording = async (): Promise<void> => {
  const plugin = getPlugin()

  if (isAnotherRecordingActive()) {
    await plugin.ui.showToast({ message: 'Another user has already enabled the recording' })
    return
  }

  const conferenceAlias = getConferenceAlias()
  const domain = config.infinity.sip_domain
  const uri = `${conferenceAlias}@${domain}`

  const result = await recordingApi.startRecording(uri);

  if (result.success) {
    setRecording({
      videoId: result.data.videoId
    });

    emitter.emit('changed')
    await plugin.ui.showToast({ message: 'Recording requested. It will start in a few seconds.' })
  } else {
    // result.error
    await plugin.ui.showToast({ message: 'Cannot start the recording' })
  }
}

const stopRecording = async (): Promise<void> => {
  const plugin = getPlugin()

  const recording = getRecording();
  const stopResult = recording 
    ? await recordingApi.stopRecording(recording)
    : undefined;

  if (stopResult?.success) {
    clearRecording();
    emitter.emit('changed')
    await plugin.ui.showToast({ message: 'Recording stopped' })
  } else {
    await plugin.ui.showToast({ message: 'Cannot stop the recording' })
  }
}

/**
 * Check if there is another user making a recording.
 */
const isAnotherRecordingActive = (): boolean => {
  if (participants == null) {
    return false
  }

  const active = participants.some(participant => {
    return recordingApi.isRecordingParticipant(participant)
  });
  return active;
}

const emitter = new EventEmitter()

export const Recording = {
  init,
  startRecording,
  stopRecording,
  isRecording,
  emitter
}
