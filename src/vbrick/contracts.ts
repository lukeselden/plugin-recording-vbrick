import type { InfinityParticipant } from '@pexip/plugin-api'
import type { ApiResult } from './request'

export interface Recording {
  videoId?: string;
  status: VideoStatus;
  rtmpStreamKey?: string;
  rtmpUrl?: string;
  lastModified?: string;
  participantUuid?: string;
}

export interface RecordingStatus {
  status: VideoStatus;
  videoId?: string;
}

export type VideoStatus = "Ready" | "Processing" | "ProcessingFailed" | "ReadyButProcessingFailed" | "NotUploaded" | "Uploading" | "UploadingFinished" | "UploadFailed" | "Ingesting" | "IngestingNotified" | "DownloadFailed" | "Connecting" | "ConnectingFailed" | "WaitingForStream" | "RecordingStream" | "StreamingFailed" | "StartRecording" | "RecordingInitializing" | "Recording" | "StopRecording" | "RecordingFinished" | "RecordingFailed" | "ViewingHoursNotAvailable";

export interface RecordingApi {
  startRecording: (title: string, timeoutSeconds?: number) => Promise<ApiResult<Partial<Recording>>>;
  stopRecording: (recording: Recording) => Promise<ApiResult<void>>;
  getStatus: (recording: Recording) => Promise<ApiResult<RecordingStatus>>;
  isRecordingParticipant: (participant: InfinityParticipant) => boolean;
}