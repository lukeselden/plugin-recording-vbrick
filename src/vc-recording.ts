import { config } from './config'
import { Auth } from './auth'

export async function startVideoConferenceRecording(title: string, sipAddress: string, sipPin?: string) {
  const path = '/api/v2/vc/start-recording'
  const url = new URL(path, config.vbrick.url)

  const body = { title, sipAddress, sipPin };

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Authorization: `VBrick ${Auth.getAccessToken()}`,
      'Content-Type': 'application/json'
    }
  })

  if (response.status === 200) {
    const {videoId} = await response.json();
    return {
      videoId
    };
  }
  return {
    error: `${response.status} ${response.statusText}`
  };
}


export async function stopVideoConferenceRecording(videoId: string) {
  const path = '/api/v2/vc/stop-recording'
  const url = new URL(path, config.vbrick.url)

  const body = { videoId }

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      Authorization: `VBrick ${Auth.getAccessToken()}`,
      'Content-Type': 'application/json'
    }
  })
  if (response.status === 200) {
    return { success: true };
  } else {
    return { error: `${response.status} ${response.statusText}` }
  }
}