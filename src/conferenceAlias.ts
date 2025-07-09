export interface ConferenceMeta {
  conferenceAlias: string
  conferenceName?: string
}
export let conferenceMeta: ConferenceMeta = {
  conferenceAlias: '',
  conferenceName: undefined
}

export const setConferenceMeta = (conferenceAlias: string, conferenceName?: string): void => {
  conferenceMeta = { conferenceAlias, conferenceName }
}
