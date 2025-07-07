const prefix = 'pexip-vbrick'

export enum LocalStorageKey {
  User = `${prefix}:user`,
  Recording = `${prefix}:recording`
}
export function getLocalStorage<T = any>(key: string): T | null {
    try {
        const json = globalThis.localStorage.getItem(key);
        return json != null ? JSON.parse(json) : null;
    } catch (e) {
    }
    return null;
}

export function setLocalStorage<T = any>(key: string, item: T | null): void {
  try {
    if (item == null) {
      globalThis.localStorage.removeItem(key);
    } else {
      globalThis.localStorage.setItem(key, JSON.stringify(item));
    }
  } catch (e) {
  }
}