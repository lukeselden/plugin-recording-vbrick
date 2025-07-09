import type { InfinityParticipant, Participant } from '@pexip/plugin-api'
import { config } from '../config'
import { plugin } from '../plugin'
import type { Recording, RecordingApi, RecordingStatus } from './contracts'
import { makeApiRequest, timeoutAfter, type ApiResult } from './request'
import { conferenceMeta } from '../conferenceAlias.js'
import { getRecording } from './recordingState.js'

/**
 * @see {@link https://revdocs.vbrick.com/reference/uploadvideo-1} For a full list of additional metadata that can be sent
 */
export interface RTMPRecordingRequest {
  /** Name given to the video. Defaults to the current date if not provided. */
  title?: string;
  /** route configured in onprem recorder for setting metadata settings - set in config file */
  route?: string;

  /** Description - safe html will be preserved */
  description?: string;
  /** list of category names */
  categories?: string[];
  /** An array of strings that are tagged to the  */
  tags?: string[];

  /**
   * Set video active status
   * @default {false}
   */
  isActive?: boolean;

  /**
   * This sets access control for the  This is an enum and can have the following values: Public/AllUsers/Private/Channels.
   */
  videoAccessControl?: "AllUsers" | "Public" | "Private";
}

/**
 * Start RTMP recording and then dial out to the participant
 * @param title 
 * @param timeoutSeconds 
 * @returns 
 */
async function startRecording(title: string, timeoutSeconds = 60): Promise<ApiResult<Partial<Recording>>> {
  const path = '/recapi/v0/rtmp/start-recording'
  const url = new URL(path, config.recorder.url);

  // first make request to RTMP recorder for the correct RTMP url
  const body: RTMPRecordingRequest = {
    title,
    route: config.recorder.route,
    ...conferenceMeta
  };
  const response = await makeApiRequest<Record<string, string>>(url, body, { method: 'POST', timeoutSeconds });

  if (response.success) {
    void dialOutParticipant(response.data.rtmpUrl);
  }
  return response;
}

async function dialOutParticipant(rtmpUrl: string): Promise<Participant> {
  const response =  await plugin.conference.dialOut({
    destination: rtmpUrl,
    // use 'auto' (call routing rules) unless flag is set in the config
    protocol: config.recorder.legacy_dialout_api === true ? 'rtmp' : 'auto',
    role: 'GUEST',
    streaming: 'yes',
    ...(config.recorder.display_name != null) && {
      text: config.recorder.display_name
    }
  });
  return response;
}

async function stopRecording({rtmpStreamKey}: Recording): Promise<ApiResult<void>> {
  // ignore request if no active recording
  if (rtmpStreamKey == null || rtmpStreamKey === '') return { success: true, data: undefined };

  const path = '/recapi/v0/rtmp/stop-recording'
  const url = new URL(path, config.recorder.url);
  const body = { rtmpStreamKey }

  const response = await makeApiRequest(url, body, { method: 'POST' })
  return response;
}

async function getStatus({rtmpStreamKey}: Recording): Promise<ApiResult<RecordingStatus>> {
  const path = `/recapi/v0/rtmp/recording-status/${rtmpStreamKey}`
  const url = new URL(path, config.recorder.url);
  const response = await makeApiRequest(url);
  // result may return array instead of single entry
  if (response.success && Array.isArray(response.data)) {
    response.data = response.data[0];
  }
  return response;
}

const {hostname: recorderHost} = new URL(config.recorder.url);
const isRecordingParticipant = ({uri}: InfinityParticipant): boolean => {
  if (!/^rtmps?:\/\//.test(uri)) return false;
  // exact match
  const {rtmpUrl} = getRecording() ?? {};
  if (rtmpUrl != null && uri === rtmpUrl) return true;
  // else check if same domain
  const participantUrl = new URL(uri.replace(/^rtmp/, 'http'));
  return participantUrl.hostname === recorderHost;
}

export const rtmpRecordingApi: RecordingApi = {
  startRecording,
  stopRecording,
  getStatus,
  isRecordingParticipant
};