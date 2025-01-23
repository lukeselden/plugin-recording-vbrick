import { config } from './config'
import { InfinityParticipant, Participant } from '@pexip/plugin-api'
import { getPlugin } from './plugin'
import { ApiResult, makeApiRequest, timeoutAfter } from './vbrick/request'
import { Recording, RecordingApi } from './vbrick/contracts'

/**
 * @see {@link https://revdocs.vbrick.com/reference/uploadvideo-1} For a full list of additional metadata that can be sent
 */
export interface RTMPRecordingRequest {
  /** Name given to the video. Defaults to the current date if not provided. */
  title?: string;
  /** template metadata settings - set in config file */
  template?: string;

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
async function startRecording(title: string, timeoutSeconds = 60): Promise<ApiResult<{ rtmpUrl: string; rtmpStreamKey: string; participant?: Participant }>> {
  const path = '/recapi/v0/rtmp/start-recording'
  const url = new URL(path, config.recorder.url);

  // first make request to RTMP recorder for the correct RTMP url
  const body: RTMPRecordingRequest = { title, template: config.recorder.template };
  const response = await makeApiRequest(url, body, { method: 'POST', timeoutSeconds });

  if (!response.success) {
    return response;
  }

  // then trigger pexip to start sending to that RTMP url
  try {
    const participant = await timeoutAfter(dialOutParticipant(response.data.rtmpUrl), timeoutSeconds);
    response.data.participant = participant;
    return response;
  } catch (error) {
    return {
      ...response,
      success: false,
      error: `${error}`
    }
  }
}

async function dialOutParticipant(rtmpUrl: string) {
  const plugin = getPlugin();

  await plugin.conference.dialOut({
    destination: rtmpUrl,
    // use 'auto' (call routing rules) unless flag is set in the config
    protocol: config.recorder.useLegacyDialOutAPI ? 'rtmp' : 'auto',
    role: 'GUEST',
    streaming: 'yes',
    ...config.recorder.displayName && {
      remote_display_name: config.recorder.displayName
    }
  });

}

async function stopRecording({rtmpStreamKey}: Recording): Promise<ApiResult<void>> {
  // ignore request if no active recording
  if (!rtmpStreamKey) return { success: true, data: undefined };

  const path = '/api/v2/vc/stop-recording'
  const url = new URL(path, config.recorder.url);
  const body = { rtmpStreamKey }

  const response = await makeApiRequest<void>(url, body, { method: 'POST' })
  return response;
}

async function getStatus({rtmpStreamKey}: Recording) {
  const path = `/recapi/v0/rtmp/recording-status/${rtmpStreamKey}`
  const url = new URL(path, config.recorder.url);
  const response = await makeApiRequest<Partial<Recording>>(url);
  return response;
}

const isRecordingParticipant = (participant: InfinityParticipant): boolean => {
  const recorderDomain = new URL(config.recorder.url).origin;

  return /rtmps?:\/\//.test(participant.uri) && new URL(participant.uri).origin === recorderDomain;
}

export const rtmpRecordingApi: RecordingApi = {
  startRecording,
  stopRecording,
  getStatus,
  isRecordingParticipant
};