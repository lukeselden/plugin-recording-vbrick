const prefix = 'pexip-vbrick'

export enum LocalStorageKey {
  User = `${prefix}:user`,
  Recording = `${prefix}:recording`
}
export function getLocalStorage(key: string): any {
    try {
        const json = globalThis.localStorage.getItem(key);
        return json ? JSON.parse(json) : undefined;
    } catch (e) {
        //ignore
    }
}

export function setLocalStorage(key: string, item: any): void {
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(item));
  } catch (err) {
  }
}

export function clearLocalStorage(key: string) {
  try {
    globalThis.localStorage.removeItem(key);
  } catch (error) {
  }
}