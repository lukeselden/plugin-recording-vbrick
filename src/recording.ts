import type { InfinityParticipant } from '@pexip/plugin-api'
import EventEmitter from 'eventemitter3'
import { updateButton } from './button'
import { conferenceMeta } from './conferenceAlias'
import { config } from './config'
import { plugin } from './plugin'

import { rtmpRecordingApi } from './vbrick/rtmp-recording'
import type { RecordingApi } from './vbrick/contracts'
import { clearRecording, getRecording, isFailedRecording, isRecording, setRecording } from './vbrick/recordingState'
import { vcRecordingApi } from './vbrick/vc-recording'

let participants: InfinityParticipant[] = []

const recordingApi: RecordingApi = config.recording_type === 'rtmp'
  ? rtmpRecordingApi
  : vcRecordingApi;

const init = (): void => {
  // Initialize the videoId at the beginning of the conference
  plugin.events.authenticatedWithConference.add(() => {
    if (participants.length === 0) {
      clearRecording()
    }
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
      await plugin.conference.setRole({
        role: 'chair',
        participantUuid: event.participant.uuid
      })
      await plugin.conference.setRole({
        role: 'guest',
        participantUuid: event.participant.uuid
      })
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
      await updateButton()
    }
  })
}

const startRecording = async (): Promise<void> => {
  if (isAnotherRecordingActive()) {
    await plugin.ui.showToast({
      message: 'Another user has already enabled the recording'
    })
    return
  }

  const domain = config.infinity.sip_domain
  const uri = `${conferenceMeta.conferenceAlias}@${domain}`

  const result = await recordingApi.startRecording(uri);

  if (result.success) {
    setRecording(result.data);

    emitter.emit('changed')
    await plugin.ui.showToast({
      message: 'Recording requested. It will start in a few seconds.'
    })
  } else {
    // result.error
    await plugin.ui.showToast({ message: 'Cannot start the recording' })
  }
}

const stopRecording = async (): Promise<void> => {
  const recording = getRecording();
  const stopResult = recording != null 
    ? await recordingApi.stopRecording(recording)
    : undefined;

  if (stopResult?.success === true || !isAnotherRecordingActive()) {
    clearRecording();
    emitter.emit('changed')
    await plugin.ui.showToast({ message: 'Recording stopped' })
  } else {
    await plugin.ui.showToast({ message: 'Cannot stop the recording' })
  }
}

const getStatus = async (): Promise<void> => {
  const recording = getRecording();
  if (recording == null) {
    return;
  }
  const statusResult = await recordingApi.getStatus(recording);

  if (statusResult.success) {
    const {status, videoId = recording.videoId} = statusResult.data;
    if (status !== recording.status || videoId !== recording.videoId) {
      Object.assign(recording, { status, videoId });
      console.log('Recording status', { status, videoId });
      emitter.emit('changed');
    }
    if (isFailedRecording()) {
      await plugin.ui.showToast({ message: 'Recording failed' })
    }
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
  getStatus,
  isRecording,
  emitter
}
