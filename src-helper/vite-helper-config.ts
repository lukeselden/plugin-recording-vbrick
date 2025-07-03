import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectFolder = resolve(__dirname, '..');

export const devConfig = JSON.parse(await fs.readFile(resolve(projectFolder, 'vite.json'), 'utf-8').catch(() => 'null'));

devConfig.infinity_url ||= devConfig.infinity?.sip_domain;

export const port: number = devConfig.port ?? 5173
export const outDir: string = devConfig.outDir || 'dist';
export const main: string = devConfig.main || 'index.html';
export const pluginName: string = devConfig.pluginName || 'vbrick';

export const builderOutput: string = devConfig.builderOutput || 'dist-builder/builder.html';
export const builderOutDir: string = dirname(builderOutput);
export const builderMain: string = basename(builderOutput);

export const artifactsFolder = resolve(projectFolder, outDir);
export const pluginDirectory = `plugins/${pluginName}`;

