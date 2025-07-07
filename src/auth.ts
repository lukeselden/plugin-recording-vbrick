import EventEmitter from 'eventemitter3'
import { config } from './config'
import { user, setUser, type User } from './user'

let codeVerifier: string

const marginInterval = 20
const defaultExpiresIn = 1800
let intervalRefreshToken: number = 0

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

  const data: User = await response.json()
  data.expiration = new Date(Date.now() + data.expires_in * 1000);
  setUser(data);

  if (intervalRefreshToken === 0) {
    startRefreshTokenInterval(
      user?.expires_in ?? defaultExpiresIn - marginInterval
    )
  }

  emitter.emit('login')
}

const getAccessToken = (): string => {
  return user?.access_token ?? ''
}

const getUser = (): User | null => {
  return user
}

const isAuthenticated = (): boolean => {
  return user != null && user.access_token !== ''
}

const getAuthHeader = (): Record<string, string> => {
  return { authorization: `vbrick ${user?.access_token}` }
}

const refreshAccessToken = async (): Promise<void> => {
  if (user == null || !isAuthenticated()) {
    throw new Error('Cannot recover the user info from the localStorage')
  }

  const path = '/api/v2/user/extend-session'
  const url = new URL(path, config.vbrick.url)

  const response = await fetch(url, {
    method: 'POST',
    headers: getAuthHeader()
  });

  const {expiration} = await response.json() as Record<string, string>
  const expireDelta = new Date(expiration).getTime() - Date.now();
  user.expires_in = Math.floor(expireDelta / 1000);
  setUser(user);

  if (intervalRefreshToken === 0) {
    startRefreshTokenInterval(
      (user?.expires_in ?? defaultExpiresIn) - marginInterval
    )
  }

  emitter.emit('refreshed_token')
}

const isSessionValid = async (): Promise<boolean> => {
  const path = '/api/v2/user/session'
  const url = new URL(path, config.vbrick.url)
  if (!isAuthenticated()) return false;
  const response = await fetch(url, {
    headers: getAuthHeader()
  }).catch(e => { console.error(e) });

  return response?.status === 200;
}

const logout = async (): Promise<void> => {
  // Send the request to logoff endpoint
  const path = '/api/v2/user/logoff'
  const url = new URL(path, config.vbrick.url)
  if (user != null && isAuthenticated()) {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        userId: user.userId
      }),
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      }
    }).catch(e => { console.warn(e) });
  }
  cleanSession()
  stopRefreshInterval()
  emitter.emit('logout')
}

const cleanSession = (): void => {
  setUser(null);
}

const startRefreshTokenInterval = (interval: number): void => {
  intervalRefreshToken = setInterval(() => {
    refreshAccessToken().catch((e) => {
      console.error(e)
    })
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
  isAuthenticated,
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
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
}

const sha256hash = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value)
  const hashed = await crypto.subtle.digest('SHA-256', bytes)
  const binary = String.fromCharCode(...new Uint8Array(hashed))
  return btoa(binary).replace(/\//g, '_').replace(/\+/g, '-').replace(/=+$/, '')
}

const handleMessage = (event: any): void => {
  const search: string = event.data.search

  if (search != null) {
    const code = new URLSearchParams(search).get('code')
    if (code != null) {
      console.log('code', code)
      Auth.createAccessToken(code).catch(console.error)
    }
  }
}

window.addEventListener('message', handleMessage)
