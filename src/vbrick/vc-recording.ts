import type { InfinityParticipant } from '@pexip/plugin-api'
import { Auth } from '../auth'
import { conferenceAlias } from '../conferenceAlias'
import { config } from '../config'
import type { Recording, RecordingApi, RecordingStatus, VideoStatus } from './contracts'
import { makeApiRequest, type ApiResult } from './request'

interface StartSipRecordingRequest {
  /** SIP address for the video recording. Normally the conference room SIP address. */
  sipAddress: string
  /** PIN */
  sipPin?: string
  /** Name given to the video. Defaults to the SIP address if not provided. */
  title?: string
  /** Record only the audio of the SIP call if it's true. It is false by default. */
  audioOnly?: boolean
}

async function startRecording(title: string, timeoutSeconds = 60): Promise<ApiResult<{ videoId: string }>> {
  const path = '/api/v2/vc/start-recording'
  const url = new URL(path, config.vbrick.url)

  const domain = config.infinity.sip_domain
  const sipAddress = `${conferenceAlias}@${domain}`
  const sipPin = ''

  const body: StartSipRecordingRequest = { title, sipAddress, sipPin };

  const response = await makeApiRequest<{ videoId: string }>(url, body, { method: 'POST', timeoutSeconds });
  return response;
}


async function stopRecording({videoId}: Recording): Promise<ApiResult<void>> {
  const path = '/api/v2/vc/stop-recording'
  const url = new URL(path, config.vbrick.url)

  const body = { videoId }
  const response = await makeApiRequest(url, body, { method: 'POST' });
  return response;
}

async function getStatus({videoId}: Recording): Promise<ApiResult<RecordingStatus>> {
  const path = `/api/v2/vc/recording-status/${videoId}`
  const url = new URL(path, config.vbrick.url)
  const response = await makeApiRequest<VideoStatus>(url);
  if (!response.success) {
    return response;
  }

  /** transform response to match Recording shape (i.e. an object) */
  return {
    success: true,
    data: {
      videoId,
      status: response.data
    }
  };
}

export const isRecordingParticipant = (participant: InfinityParticipant): boolean => {
  const domain = new URL(config.vbrick.url).hostname
  const recordingUri = `sip:${Auth.getUser()?.username}@${domain}`

  return participant.uri === recordingUri
}

export const vcRecordingApi: RecordingApi = {
  startRecording,
  stopRecording,
  getStatus,
  isRecordingParticipant
};