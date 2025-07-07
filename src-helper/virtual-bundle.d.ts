import type { PluginConfig } from '../src/config.js'

export interface Artifacts<T extends Uint8Array | string = Uint8Array | string> {
  main: string
  assets: Record<string, T>
  folder: string
  defaults?: Partial<PluginConfig> & {infinity_url?: string, branding_path?: string}
}

declare module 'virtual:bundle' {
  declare const encodedArtifacts: Artifacts<string>
  export default encodedArtifacts
}