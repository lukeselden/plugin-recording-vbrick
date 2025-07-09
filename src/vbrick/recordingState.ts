import type { Recording, VideoStatus } from './contracts'
import { getLocalStorage, LocalStorageKey, setLocalStorage } from '../storage'
import { config } from '../config'

let recording: Recording | null = getLocalStorage(LocalStorageKey.Recording)

export const setRecording = (value: Recording | null = null): void => {
  recording = value
  setLocalStorage(LocalStorageKey.Recording, recording)
}

export const getRecording = (): Recording | null => recording

export const clearRecording = (): void => {
  recording = null
  setLocalStorage(LocalStorageKey.Recording, null)
}

export const updateRecording = (updates: Partial<Recording>): void => {
  if (recording == null) return
  setRecording(Object.assign(recording, updates))
}

const activeStatuses: VideoStatus[] = [
  'Recording',
  'Connecting',
  'WaitingForStream',
  'RecordingStream',
  'StartRecording',
  'RecordingInitializing',
  'StopRecording'
]

export const hasRecording = (): boolean => {
  const key =
    config.recording_type === 'rtmp'
      ? recording?.rtmpStreamKey
      : recording?.videoId
  return key != null && key !== ''
}
export const isRecording = (): boolean =>
  hasRecording() &&
  typeof recording?.status === 'string' &&
  activeStatuses.includes(recording.status)

export const isConnectingRecording = (): boolean =>
  recording?.status === 'Connecting' || recording?.status === 'WaitingForStream'

export const isActiveRecording = (): boolean =>
  !isConnectingRecording() && isRecording()

export const isFailedRecording = (): boolean =>
  recording?.status === 'ConnectingFailed' ||
  recording?.status === 'RecordingFailed'
