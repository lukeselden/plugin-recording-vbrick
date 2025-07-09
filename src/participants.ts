import type { InfinityParticipant } from '@pexip/plugin-api'
import { plugin } from './plugin.js'
import type { VideoStatus } from './vbrick/contracts.js'
import { timeoutAfter } from './vbrick/request.js'

let participants: InfinityParticipant[] = []

export const getParticipants = (): InfinityParticipant[] => participants;

export const setParticipants = (value: InfinityParticipant[]): void => {
  participants = value
}

export const findParticipant = (cb: (participant: InfinityParticipant) => boolean): InfinityParticipant | undefined => participants.find(cb)

export const getParticipantVideoStatus = (
  { serviceType }: InfinityParticipant,
  isDisconnect = false
): VideoStatus => {
  if (isDisconnect) {
    return serviceType === 'connecting'
      ? 'ConnectingFailed'
      : 'RecordingFinished'
  }
  return serviceType === 'connecting' ? 'WaitingForStream' : 'Recording'
}

export const waitForParticipantList = async (
  timeoutSeconds = 15
): Promise<void> => {
  // wait for a participant list and successfully connected
  const whenJoined = Promise.all([
    new Promise<void>((resolve) =>
      plugin.events.participants.addOnce(() => {
        resolve()
      })
    ),
    new Promise<void>((resolve) =>
      plugin.events.authenticatedWithConference.addOnce(() => {
        resolve()
      })
    )
  ])

  await timeoutAfter(whenJoined, timeoutSeconds)
}
