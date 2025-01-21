import EventEmitter from 'eventemitter3'
import { config } from './config'
import { LocalStorageKey } from './LocalStorageKey'

let user: User | null = JSON.parse(
  localStorage.getItem(LocalStorageKey.User) ?? 'null'
)

let codeVerifier: string

const marginInterval = 20
const defaultExpiresIn = 1800
let intervalRefreshToken: number = 0

interface User {
  userId: string
  username: string
  firstName: string
  lastName: string
  scope: string
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

const getAuthUrl = async (): Promise<string> => {
  const authPath = '/api/v2/oauth2/authorize'
  const url = new URL(authPath, config.vbrick.url)
  url.searchParams.set('client_id', config.vbrick.client_id)
  url.searchParams.set('code_challenge', await generateCodeChallenge())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', config.vbrick.redirect_uri)
  return url.toString()
}

const createAccessToken = async (code: string): Promise<void> => {
  const path = '/api/v2/oauth2/token'
  const url = new URL(path, config.vbrick.url)

  const body = {
    code: code.replace(/ /g, '+'),
    grant_type: 'authorization_code',
    client_id: config.vbrick.client_id,
    redirect_uri: config.vbrick.redirect_uri,
    code_verifier: codeVerifier
  }

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  })

  user = await response.json()
  localStorage.setItem(LocalStorageKey.User, JSON.stringify(user))

  if (intervalRefreshToken === 0) {
    startRefreshTokenInterval(user?.expires_in ?? defaultExpiresIn - marginInterval)
  }

  emitter.emit('login')
}

const getAccessToken = (): string => {
  return user?.access_token ?? ''
}

const getUser = (): User | null => {
  return user
}

const refreshAccessToken = async (): Promise<void> => {
  if (user == null) {
    throw new Error('Cannot recover the user info from the localStorage')
  }

  const path = '/api/v2/oauth2/token'
  const url = new URL(path, config.vbrick.url)

  const body = {
    grant_type: 'refresh_token',
    client_id: config.vbrick.client_id,
    redirect_uri: config.vbrick.redirect_uri,
    refresh_token: user.refresh_token
  }

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json'
    }
  })

  user = await response.json()
  localStorage.setItem(LocalStorageKey.User, JSON.stringify(user))

  if (intervalRefreshToken === 0) {
    startRefreshTokenInterval(user?.expires_in ?? defaultExpiresIn - marginInterval)
  }

  emitter.emit('refreshed_token')
}

const isSessionValid = async (): Promise<boolean> => {
  const path = '/api/v2/user/session'
  const url = new URL(path, config.vbrick.url)
  const response = await fetch(url, {
    headers: {
      Authorization: `vbrick ${user?.access_token}`
    }
  })
  if (response.status === 200) {
    return true
  }
  return false
}

const logout = async (): Promise<void> => {
  // Send the request to logoff endpoint
  const path = '/api/v2/user/logoff'
  const url = new URL(path, config.vbrick.url)
  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      userId: user?.userId
    }),
    headers: {
      Authorization: `vbrick ${user?.access_token}`,
      'Content-Type': 'application/json'
    }
  })
  cleanSession()
  stopRefreshInterval()
  emitter.emit('logout')
}

const cleanSession = (): void => {
  localStorage.removeItem(LocalStorageKey.User)
  user = null
}

const startRefreshTokenInterval = (interval: number): void => {
  intervalRefreshToken = setInterval(() => {
    refreshAccessToken().catch((e) => { console.error(e) })
  }, interval * 1000)
}

const stopRefreshInterval = (): void => {
  clearInterval(intervalRefreshToken)
  intervalRefreshToken = 0
}

const emitter = new EventEmitter()

export const Auth = {
  getAuthUrl,
  createAccessToken,
  getAccessToken,
  getUser,
  refreshAccessToken,
  isSessionValid,
  logout,
  cleanSession,
  emitter
}

const generateCodeChallenge = async (): Promise<string> => {
  codeVerifier = randomVerifier(48)
  const codeChallenge = await sha256hash(codeVerifier)
  return codeChallenge
}

const randomVerifier = (byteLength: number): string => {
  const randomValues = crypto.getRandomValues(new Uint8Array(byteLength / 2))
  return Array.from(randomValues)
    .map(c => c.toString(16).padStart(2, '0'))
    .join('')
}

const sha256hash = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value)
  const hashed = await crypto.subtle.digest('SHA-256', bytes)
  const binary = String.fromCharCode(...(new Uint8Array(hashed)))
  return btoa(binary)
    .replace(/\//g, '_')
    .replace(/\+/g, '-')
    .replace(/=+$/, '')
}
