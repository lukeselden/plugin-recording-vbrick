import { Auth } from '../auth'

export type ApiResult<T> = { success: true, data: T } | { success: false, error: string }

export async function makeApiRequest<T = any>(url: URL, body?: Record<string, any>, request?: RequestInit & {timeoutSeconds?: number}): Promise<ApiResult<T>> {
  const {
    headers: optHeaders,
    timeoutSeconds = 0,
    ...optInit
  } = request ?? {};

  const headers = new Headers(optHeaders);
  const token = Auth.getAccessToken();
  if (token) {
    headers.set('authorization', `Vbrick ${token}`);
  }

  const init: RequestInit = { ...optInit, headers };

  if (body && /put|post|patch/i.test(init.method ?? '')) {
    headers.set('content-type', 'application/json');
    init.body = JSON.stringify(body);
  } else if (body) {
    // add body as query parameters to GET/DELETE requests
    Object.entries(body).forEach(([k, v]) => headers.set(k, v));
  }
  
  let response: Response;
  try {
    response = timeoutSeconds > 0
      ? await timeoutAfter(fetch(url, init), timeoutSeconds)
      : await fetch(url, init);
  } catch (error) {
    response = {
      ok: false,
      status: -1,
      statusText: `${error ?? 'Request Failed'}`
    } as Response;
  }

  if (response.status === 200) {
    return {
      success: true,
      data: await response.json().catch(() => undefined)
    };
  }
  return {
    success: false,
    error: `${response.status} ${response.statusText}`,
  };
}


export async function timeoutAfter<T>(promise: Promise<T>, seconds: number): Promise<T> {
  let timer = -1;
  return Promise.race([
    promise,
    new Promise<never>((resolve, reject) => {
      timer = setTimeout(() => reject(new DOMException('Timeout', 'TimeoutError')), seconds * 1000);
    })
  ]).finally(() => clearTimeout(timer));
}
