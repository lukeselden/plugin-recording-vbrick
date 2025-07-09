/**
  *  https://github.com/101arrowz/fflate
  MIT License
  
  Copyright (c) 2023 Arjun Barrett
  
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  */
import { unzipSync, zipSync, strFromU8, strToU8, type Unzipped } from 'fflate'
import type { PluginConfig } from '../src/config.js'
import artifacts from './vite-bundled-artifacts.js'
import { addArtifactsToZip, getEntryPoint, pathJoin } from './artifact-utils.js'
import type { Artifacts } from './virtual-bundle.js'

interface UpdateOptions {
  updateVersion?: boolean
  sandboxValues?: string[]
}

interface Manifest {
  version: number
  applicationConfig: {
    handleOauthRedirects: boolean
  }
  plugins: Array<{ src: string; sandboxValues?: string[] }>
}

const BASE_BRANDING_FOLDER = 'webapp3/branding'
// text to append when outputting a modified branding zip file
const FILE_SUFFIX = '-vbrick'

async function extractBrandingZip(file?: File): Promise<Unzipped> {
  if (file == null) return {}
  const bytes = new Uint8Array(await file.arrayBuffer())
  const data = unzipSync(bytes)
  return data
}

export async function getConfigFromBrandingZip(
  file?: File
): Promise<Artifacts['defaults'] | undefined> {
  if (file == null) return undefined
  const listing = await extractBrandingZip(file)
  const configPath = pathJoin(
    BASE_BRANDING_FOLDER,
    artifacts.folder,
    'config.json'
  )
  const configEntry = Object.entries(listing).find(([k, v]) =>
    k.endsWith(configPath)
  )

  return configEntry != null
    ? (JSON.parse(strFromU8(configEntry[1])) as Artifacts['defaults'])
    : undefined
}

function getOutputFilename(file?: File): string {
  return `${(file?.name ?? 'branding').replace(/\.zip$/i, FILE_SUFFIX)}.zip`
}

function updateManifest(branding: Unzipped, opts: UpdateOptions): void {
  const { manifest, manifestPath } = getManifest(branding)

  // add plugin/update in list of plugins
  addPluginEntry(manifest, opts)

  // make sure oauth enabled
  manifest.applicationConfig = {
    ...manifest.applicationConfig,
    handleOauthRedirects: true
  }
  // increment version
  if (opts.updateVersion === true) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- input could be invalid
    manifest.version = (manifest.version ?? 0) + 1
  }
  // update data in branding zip
  branding[manifestPath] = strToU8(JSON.stringify(manifest))
}

function getManifest(listing: Record<string, Uint8Array>): {
  manifestPath: string
  manifest: Manifest
} {
  const [manifestPath, bytes] = Object.entries(listing).find(([key]) =>
    key.endsWith('manifest.json')
  ) ?? ['', new Uint8Array()]
  if (manifestPath === '' || bytes.length === 0) {
    throw new Error('Invalid branding zip - no manifest.json found')
  }
  const manifest = JSON.parse(strFromU8(bytes)) as Manifest
  return {
    manifestPath,
    manifest
  }
}

function addPluginEntry(manifest: Manifest, opts: UpdateOptions): void {
  const {
    sandboxValues = ['allow-same-origin', 'allow-popups', 'allow-forms']
  } = opts

  const pluginEntry = {
    src: getEntryPoint(artifacts),
    sandboxValues
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- input could be null
  manifest.plugins ??= []
  const existing = manifest.plugins.find(({ src }) =>
    src.endsWith(pluginEntry.src)
  )
  if (existing != null) {
    existing.sandboxValues = pluginEntry.sandboxValues
  } else {
    manifest.plugins.push(pluginEntry)
  }
}

export async function generatePackage(
  file: File,
  config: PluginConfig
): Promise<File> {
  const opts: UpdateOptions = {}
  const branding = await extractBrandingZip(file)

  // change manifest to include plugin and set options
  updateManifest(branding, opts)

  // add generated config
  const pluginContent: Artifacts<Uint8Array> = {
    ...artifacts,
    assets: {
      ...artifacts.assets,
      'config.json': strToU8(JSON.stringify(config, null, '  '))
    }
  }

  // put plugin files into branding zip
  addArtifactsToZip(branding, pluginContent, BASE_BRANDING_FOLDER)

  console.log('Plugin artifacts:', Object.keys(branding))

  const bytes = zipSync(branding)
  return new File([bytes], getOutputFilename(file), {
    type: 'application/x-zip-compressed'
  })
}
