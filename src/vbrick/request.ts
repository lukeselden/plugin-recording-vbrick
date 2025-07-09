import { Auth } from '../auth'

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function makeApiRequest<T = any>(
  url: URL,
  body?: Record<string, any>,
  request?: RequestInit & { timeoutSeconds?: number }
): Promise<ApiResult<T>> {
  const { timeoutSeconds = 0 } = request ?? {}

  const init = createRequest(request, body)

  try {
    const response =
      timeoutSeconds > 0
        ? await timeoutAfter(fetch(url, init), timeoutSeconds)
        : await fetch(url, init)

    if (response.status !== 200) {
      return {
        success: false,
        error: `${response.status} ${response.statusText}`
      }
    }
    return {
      success: true,
      data: await response.json().catch(() => undefined)
    }
  } catch (error) {
    return {
      success: false,
      error: error?.toString?.() ?? 'Request Failed'
    }
  }
}

function createRequest(
  request?: RequestInit,
  body?: Record<string, any>
): RequestInit {
  const headers = new Headers(request?.headers)
  const token = Auth.getAccessToken()
  if (token !== '') {
    headers.set('authorization', `Vbrick ${token}`)
  }
  const init: RequestInit = { ...request, headers }
  if (body == null) {
    // ignore
  } else if (/put|post|patch/i.test(init.method ?? '')) {
    headers.set('content-type', 'application/json')
    init.body = JSON.stringify(body)
  } else {
    // add body as query parameters to GET/DELETE requests
    Object.entries(body).forEach(([k, v]) => {
      headers.set(k, v as string)
    })
  }
  return init
}

export async function timeoutAfter<T>(
  promise: Promise<T>,
  seconds: number
): Promise<T> {
  let timer = -1
  return await Promise.race([
    promise,
    new Promise<never>((resolve, reject) => {
      timer = setTimeout(() => {
        reject(new DOMException('Timeout', 'TimeoutError'))
      }, seconds * 1000)
    })
  ]).finally(() => {
    clearTimeout(timer)
  })
}
