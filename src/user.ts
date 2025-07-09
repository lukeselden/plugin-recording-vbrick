import { getLocalStorage, LocalStorageKey, setLocalStorage } from './storage.js'

export interface User {
  userId: string
  username: string
  firstName: string
  lastName: string
  scope: string
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expiration: Date
}

export let user: User | null = getLocalStorage(LocalStorageKey.User)

export const setUser = (value: User | null): void => {
  user = value
  setLocalStorage(LocalStorageKey.User, user)
}
