import { type Unzipped } from 'fflate'
import type { Artifacts } from './virtual-bundle.js'

// note: `buffer` arg can be an ArrayBuffer or a Uint8Array
function toBase64(buffer: Uint8Array): string {
  const bytes = new TextDecoder('utf8').decode(buffer);
  return btoa(bytes);
}
function fromBase64(encoded: string): Uint8Array {
  const bytes = atob(encoded)
    .split('')
    .map(c => c.charCodeAt(0));
  return new Uint8Array(bytes);
}


export function pathJoin(...paths: string[]): string {
  return paths
    .filter(s => s != null && s !== '')
    .reduce((agg, path) => `${agg !== '' ? agg.replace(/\/*$/, '/') : ''}${path.replaceAll(/[/\\]+/g, '/')}`, '');
}

export function encodeArtifacts(input: Artifacts): Artifacts<string> {
  return {
    ...input,
    assets: Object.fromEntries(
      Object.entries(input.assets).map(([key, value]) => [key, typeof value === 'string' ? value : toBase64(value)])
    )
  }
}

export function decodeArtifacts(encoded: Artifacts<string>): Artifacts<Uint8Array> {
  return {
    ...encoded,
    assets: Object.fromEntries(
      Object.entries(encoded.assets).map(([key, value]) => [key, typeof value === 'string' ? fromBase64(value) : value])
    )
  }
}

export function getEntryPoint(artifacts: Artifacts): string {
  return pathJoin(artifacts.folder, artifacts.main);
}

export function addArtifactsToZip(contents: Unzipped, listing: Artifacts<Uint8Array>, directory = ''): Unzipped {
  const {assets, folder} = listing;
  for (const [key, value] of Object.entries(assets)) {
    const bytes = typeof value === 'string' ? fromBase64(value) : value;
    const path = pathJoin(directory, folder, key);
    contents[path] = bytes;
  }
  return contents;
}