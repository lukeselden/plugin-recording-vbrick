import type { InfinityParticipant } from '@pexip/plugin-api'
import EventEmitter from 'eventemitter3'
import { conferenceMeta } from './conferenceAlias'
import { config } from './config'
import { plugin } from './plugin'

import type { RecordingApi, VideoStatus } from './vbrick/contracts'
import {
  clearRecording,
  getRecording,
  hasRecording,
  isActiveRecording,
  isConnectingRecording,
  isRecording,
  setRecording,
  updateRecording
} from './vbrick/recordingState'
import { timeoutAfter } from './vbrick/request.js'
import { rtmpRecordingApi } from './vbrick/rtmp-recording'
import { vcRecordingApi } from './vbrick/vc-recording'

let participants: InfinityParticipant[] = []

const recordingApi: RecordingApi =
  config.recording_type === 'rtmp' ? rtmpRecordingApi : vcRecordingApi

const init = (): void => {
  const listeners = [
    plugin.events.participantJoined.add(async ({ participant }) => {
      if (recordingApi.isRecordingParticipant(participant)) {
        if (isConnectingRecording()) {
          refreshRecordingStatus(participant)
        }

        void plugin.conference.setLayout({
          transforms: { recording_indicator: true }
        })

        try {
          // With this we avoid having to pass the PIN (host or guest) to Vbrick
          await plugin.conference.setRole({
            role: 'chair',
            participantUuid: participant.uuid
          })
          await plugin.conference.setRole({
            role: 'guest',
            participantUuid: participant.uuid
          })
        } catch (error) {
          // fails if participant failed to connect
        }
      }
    }),

    plugin.events.participantLeft.add(({ participant }) => {
      if (recordingApi.isRecordingParticipant(participant)) {
        refreshRecordingStatus(participant, true)
        void plugin.conference.setLayout({
          transforms: { recording_indicator: false }
        })
      }
    }),

    // Check if we were recording before. This way we can recover the state in
    // case the user reload the page
    plugin.events.participants.add(({ participants: value }) => {
      participants = value
      // check if recording participant has connected
      if (isConnectingRecording()) {
        refreshRecordingStatus()
      }
    })
  ]

  plugin.events.me.addOnce(({ participant }) => {
    if (participant.role === 'chair') {
      void verifyRecordingOnJoin()
    } else {
      listeners.forEach((listener) => {
        listener()
      })
    }
  })
}

function getParticipantVideoStatus(
  { serviceType }: InfinityParticipant,
  isDisconnect = false
): VideoStatus {
  if (isDisconnect) {
    return serviceType === 'connecting'
      ? 'ConnectingFailed'
      : 'RecordingFinished'
  }
  return serviceType === 'connecting' ? 'WaitingForStream' : 'Recording'
}

function refreshRecordingStatus(
  participant?: InfinityParticipant,
  isDisconnect = false
): void {
  const recording = getRecording()
  participant ??= getCurrentRecordingParticipant()

  if (
    recording == null ||
    participant == null ||
    (recording.participantUuid != null &&
      participant.uuid !== recording.participantUuid)
  ) {
    return
  }
  const status = getParticipantVideoStatus(participant, isDisconnect)

  if (recording.status !== status) {
    updateRecording({ status, participantUuid: participant.uuid })
    emitter.emit('changed')
  }
}

// Validate stored recording state at the beginning of the conference
async function verifyRecordingOnJoin(): Promise<void> {
  // skip if no current active recording or not active
  if (!isRecording() || isAnotherRecordingActive()) {
    return
  }
  try {
    // wait for a participant list and successfully connected
    const whenJoined = Promise.all([
      new Promise<InfinityParticipant[]>((resolve) =>
        plugin.events.participants.addOnce(({ participants }) => {
          resolve(participants)
        })
      ),
      new Promise<void>((resolve) =>
        plugin.events.authenticatedWithConference.addOnce(() => {
          resolve()
        })
      )
    ])

    await timeoutAfter(whenJoined, 15).catch((err: unknown) => {
      console.warn('Timeout waiting for participant list on first join', err)
    })
    const recording = getRecording()
    const active = getCurrentRecordingParticipant()
    const isSameParticipant =
      active != null && recording?.participantUuid === active.uuid

    if (isActiveRecording() && isSameParticipant) {
      // still recording, recording record is valid
      return
    }
  } catch (error) {
    console.error('Failed to refresh recording status', error)
  }
  clearRecording()
  emitter.emit('changed')
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

  const result = await recordingApi.startRecording(uri)

  if (result.success) {
    setRecording({
      status: 'Connecting',
      ...result.data
    })

    emitter.emit('changed')
    await plugin.ui.showToast({
      message: 'Recording requested. It will start in a few seconds.'
    })
    void scheduleTimeoutError()
  } else {
    // result.error
    await plugin.ui.showToast({ message: 'Cannot start the recording' })
  }
}

const stopRecording = async (): Promise<void> => {
  const recording = getRecording()
  const stopResult =
    recording != null ? await recordingApi.stopRecording(recording) : undefined

  if (stopResult?.success === true || !isAnotherRecordingActive()) {
    clearRecording()
    emitter.emit('changed')
    await plugin.ui.showToast({ message: 'Recording stopped' })
  } else {
    await plugin.ui.showToast({ message: 'Cannot stop the recording' })
  }
}

async function scheduleTimeoutError(timeoutSeconds = 60): Promise<void> {
  const whenChanged = new Promise((resolve, reject) =>
    emitter.once('changed', resolve)
  )
  try {
    await timeoutAfter(whenChanged, timeoutSeconds)
  } catch (error) {
    if (!isConnectingRecording()) return

    const active = getCurrentRecordingParticipant()
    if (active != null && active.serviceType !== 'connecting') {
      updateRecording({ status: 'Recording', participantUuid: active.uuid })
      emitter.emit('changed')
    } else {
      updateRecording({ status: 'ConnectingFailed' })
      emitter.emit('changed')
      await plugin.ui.showToast({ message: 'Cannot start the recording' })
    }
  }
}

const getStatus = async (): Promise<VideoStatus | undefined> => {
  const recording = getRecording()
  if (recording == null) {
    return
  }
  const statusResult = await recordingApi.getStatus(recording)

  if (statusResult.success) {
    const {
      data: { status, videoId = recording.videoId }
    } = statusResult
    if (status !== recording.status || videoId !== recording.videoId) {
      updateRecording({ status, videoId })
      emitter.emit('changed')
    }
    // if (isFailedRecording()) {
    //   await plugin.ui.showToast({ message: 'Recording failed' })
    // }
    return recording.status
  }
}

const getCurrentRecordingParticipant = (): InfinityParticipant | undefined => {
  const { participantUuid } = getRecording() ?? {}
  return participantUuid == null
    ? getRecordingParticipant()
    : participants.find((p) => p.uuid === participantUuid)
}

const getRecordingParticipant = (
  list = participants
): InfinityParticipant | undefined =>
  list.find((participant) => recordingApi.isRecordingParticipant(participant))

/**
 * Check if there is another user making a recording.
 */
const isAnotherRecordingActive = (): boolean =>
  getRecordingParticipant() != null

const emitter = new EventEmitter()

export const Recording = {
  init,
  startRecording,
  stopRecording,
  getStatus,
  hasRecording,
  isRecording,
  isRecordingParticipant: recordingApi.isRecordingParticipant,
  emitter
}
