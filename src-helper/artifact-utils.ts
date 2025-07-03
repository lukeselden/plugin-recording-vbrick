import { type Unzipped } from 'fflate'
import type { PluginConfig } from '../src/config.js'

export interface Artifacts<T extends Uint8Array | string = Uint8Array | string> {
  main: string
  assets: Record<string, T>
  folder: string
  defaults?: Partial<PluginConfig> & {infinity_url?: string, branding_path?: string}
}

// note: `buffer` arg can be an ArrayBuffer or a Uint8Array
function toBase64(buffer: Uint8Array) {
  const bytes = new TextDecoder('utf8').decode(buffer);
  return btoa(bytes);
}
function fromBase64(encoded: string) {
  const bytes = atob(encoded)
    .split('')
    .map(c => c.charCodeAt(0));
  return new Uint8Array(bytes);
}


export function pathJoin(...paths: string[]) {
  return paths
    .filter(s => !!s)
    .reduce((agg, path) => `${agg ? agg.replace(/\/*$/, '/') : ''}${path.replaceAll(/[\/\\]+/g, '/')}`, '');
}

export function encodeArtifacts(input: Artifacts): Artifacts<string> {
  return {
    ...input,
    assets: Object.fromEntries(
      Object.entries(input.assets).map(([key, value]) => [key, typeof value === 'string' ? value : toBase64(value)])
    )
  }
}

export function decodeArtifacts(encoded: Artifacts): Artifacts<Uint8Array> {
  return {
    ...encoded,
    assets: Object.fromEntries(
      Object.entries(encoded.assets).map(([key, value]) => [key, typeof value === 'string' ? fromBase64(value) : value])
    )
  }
}

export function getEntryPoint(artifacts: Artifacts) {
  return pathJoin(artifacts.folder, artifacts.main);
}

export function addArtifactsToZip(contents: Unzipped, listing: Artifacts<Uint8Array>, directory = '') {
  const {assets, folder} = listing;
  for (let [key, value] of Object.entries(assets)) {
    const bytes = typeof value === 'string' ? fromBase64(value) : value;
    const path = pathJoin(directory, folder, key);
    contents[path] = bytes;
  }
  return contents;
}