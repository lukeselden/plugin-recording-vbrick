import type { Recording } from './contracts'
import { clearLocalStorage, getLocalStorage, LocalStorageKey, setLocalStorage } from '../LocalStorageKey'
import { config } from '../config'

let recording: Recording | null = getLocalStorage(LocalStorageKey.Recording)

export const setRecording = (value: Recording | null = null): void => {
  recording = value;
  setLocalStorage(LocalStorageKey.Recording, recording)
}

export const getRecording = (): Recording | null => {
  return recording
}

export const clearRecording = () => {
  recording = null;
  clearLocalStorage(LocalStorageKey.Recording);
}

export const isRecording = (): boolean => {
  const isRtmp = config.recording_type === 'rtmp';
  return isRtmp
    ? !!recording?.rtmpStreamKey
    : !!recording?.videoId;
}

export const isFailedRecording = (): boolean => {
  return isRecording() && recording?.status === "ConnectingFailed"
    || recording?.status === "RecordingFailed";
}