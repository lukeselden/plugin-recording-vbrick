import type { Plugin } from '@pexip/plugin-api'

export let plugin: Plugin

export const setPlugin = (p: Plugin): void => {
  plugin = p
}
