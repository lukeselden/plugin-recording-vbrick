import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import mkcert from 'vite-plugin-mkcert'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { main, artifactsFolder, pluginDirectory, builderOutDir, builderMain, devConfig} from './src-helper/vite-helper-config.js'

import inlineAssetsPlugin from './src-helper/vite-plugin-bundler.js'
import { pathJoin } from './src-helper/artifact-utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const VIRTUAL_ID = 'virtual:bundle';
const builderSource = resolve(__dirname, 'src-helper');


// ensure builder isn't included in bundle..it shouldn't
const omit = [pathJoin(builderOutDir, builderMain)];

export default defineConfig(({ command, mode }) => {
  // during development set defauls for helper page. But when using build command don't include
  const defaults = command === 'serve'
    ? devConfig
    : undefined;

  return {
    root: builderSource,
    publicDir: false,
    build: {
      target: 'esnext',
      outDir: resolve(__dirname, builderOutDir),
      rollupOptions: {
        input: {
          main: resolve(builderSource, builderMain)
        },
      },
    },
    server: {
      https: true
    },
    plugins: [
      mkcert(),
      viteSingleFile(),
      // creates an entry point that encodes all the artifacts as strings
      inlineAssetsPlugin(VIRTUAL_ID, { artifactsFolder, main, pluginDirectory, omit, defaults })
    ]
  };
});