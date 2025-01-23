import type { Recording } from './contracts'
import { LocalStorageKey } from '../LocalStorageKey'
import { config } from '../config'

let recording: Recording | null = JSON.parse(
  localStorage.getItem(LocalStorageKey.Recording) ?? 'null'
)

export const setRecording = (value: Recording | null = null): void => {
  recording = value;
  localStorage.setItem(LocalStorageKey.Recording, JSON.stringify(recording))
}

export const getRecording = (): Recording | null => {
  return recording
}

export const clearRecording = () => {
  recording = null;
  localStorage.removeItem(LocalStorageKey.Recording);
}

export const isRecording = (): boolean => {
  return !!recording?.videoId;
}
