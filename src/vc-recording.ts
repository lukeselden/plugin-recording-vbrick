import { config } from './config'
import { Auth } from './auth'
import { ApiResult, makeApiRequest } from './vbrick/request'

export async function startVideoConferenceRecording(title: string, sipAddress: string, sipPin?: string) {
  const path = '/api/v2/vc/start-recording'
  const url = new URL(path, config.vbrick.url)

  const body = { title, sipAddress, sipPin };


  const response = await makeApiRequest<{ videoId: string }>(url, body, { method: 'POST', timeoutSeconds });
  return response;
}


export async function stopVideoConferenceRecording(videoId: string) {
  const path = '/api/v2/vc/stop-recording'
  const url = new URL(path, config.vbrick.url)

  const body = { videoId }
  const response = await makeApiRequest<void>(url, body, { method: 'POST' });
  return response;

    }
  }
}