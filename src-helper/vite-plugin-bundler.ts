// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import type {Plugin} from 'vite';
import { encodeArtifacts, pathJoin, type Artifacts } from './artifact-utils.js'

async function getFiles(directory: string, omit: string[] = []) {
  const assets: Record<string, Uint8Array> = {};
  const files = await fs.readdir(directory, {
      withFileTypes: true,
      recursive: true
  });
  for (let file of files) {
    if (!file.isFile()) continue;
    const dir = path.relative(directory, file.parentPath);
    // make sure unix paths
    const zipPath = pathJoin(dir, file.name);

    if (omit.includes(zipPath)) {
      console.log(`Skipping omitted file ${omit}`);
    }

    const sourcePath = path.join(directory, dir, file.name);
    const content = await fs.readFile(sourcePath);
    // result[zipPath] = content.toString('base64');
    assets[zipPath] = content.toString('base64');
  }
  return assets;
}

export interface InlinePluginOptions {
  artifactsFolder: string;
  main: string;
  pluginDirectory: string;
  omit?: string[];
  defaults?: Artifacts['defaults']
}

export default function inlineAssetsPlugin(virtualId: string, {artifactsFolder, main, pluginDirectory, omit, defaults}: InlinePluginOptions): Plugin {
  const resolvedId = `\0${virtualId}`;
  let cached = '';
  return {
    name: 'pexip-inline-assets',
    resolveId(id) {
      if (id !== virtualId) return;
      return resolvedId;
    },
    async load(id) {
      if (id !== resolvedId) return;
      if (!cached) {
        console.log(`inlining plugin assets from ${artifactsFolder}`);
        const assets = await getFiles(artifactsFolder, omit);
        const payload = encodeArtifacts({ main, assets, folder: pluginDirectory, defaults });
        cached = `export default ${JSON.stringify(payload)};`
      }
      return cached;
    }
  }
}