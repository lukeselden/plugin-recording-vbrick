import type { Recording } from './contracts'
import { getLocalStorage, LocalStorageKey, setLocalStorage } from '../storage'
import { config } from '../config'

let recording: Recording | null = getLocalStorage(LocalStorageKey.Recording)

export const setRecording = (value: Recording | null = null): void => {
  recording = value;
  setLocalStorage(LocalStorageKey.Recording, recording)
}

export const getRecording = (): Recording | null => {
  return recording
}

export const clearRecording = (): void => {
  recording = null;
  setLocalStorage(LocalStorageKey.Recording, null);
}

export const isRecording = (): boolean => {
  const key = config.recording_type === 'rtmp'
    ? recording?.rtmpStreamKey
    : recording?.videoId;

  return key != null && key !== '';
}

export const isFailedRecording = (): boolean => {
  return isRecording() && recording?.status === "ConnectingFailed"
    || recording?.status === "RecordingFailed";
}