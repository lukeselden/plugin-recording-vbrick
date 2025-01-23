import { InfinityParticipant } from '@pexip/plugin-api'
import { ApiResult } from './request'

export interface Recording {
  videoId?: string;
  status?: VideoStatus;
}

export type VideoStatus = "Ready" | "Processing" | "ProcessingFailed" | "ReadyButProcessingFailed" | "NotUploaded" | "Uploading" | "UploadingFinished" | "UploadFailed" | "Ingesting" | "IngestingNotified" | "DownloadFailed" | "Connecting" | "ConnectingFailed" | "WaitingForStream" | "RecordingStream" | "StreamingFailed" | "StartRecording" | "RecordingInitializing" | "Recording" | "StopRecording" | "RecordingFinished" | "RecordingFailed" | "ViewingHoursNotAvailable";

export interface RecordingApi {
  startRecording(title: string, timeoutSeconds?: number): Promise<ApiResult<Partial<Recording>>>;
  stopRecording(recording: Recording): Promise<ApiResult<void>>;
  getStatus(recording: Recording): Promise<ApiResult<Partial<Recording>>>;
  isRecordingParticipant(participant: InfinityParticipant): boolean;
}