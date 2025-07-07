import { defineConfig } from 'vite'
import { dirname, basename } from 'node:path'
import mkcert from 'vite-plugin-mkcert'
import { viteSingleFile } from 'vite-plugin-singlefile'

import inlineAssetsPlugin from './src-helper/vite-plugin-bundler.js'

import {config, updateDevConfig, type BuildConfig} from './vite.config.js';

interface HelperConfig extends BuildConfig {
  builderOutput: string
}

const helperConfig: HelperConfig = {
  builderOutput: 'dist/branding-helper.html',
  ...config,
}

const VIRTUAL_ID = 'virtual:bundle';

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    updateDevConfig(helperConfig);
  }
  // during development set defauls for helper page. But when using build command don't include
  const defaults = command === 'serve'
    ? helperConfig
    : undefined;

  return {
    // root: 'src-helper',
    publicDir: false,
    build: {
      target: 'esnext',
      outDir: dirname(helperConfig.builderOutput),
      emptyOutDir: false,
      rollupOptions: {
        input: {
          main: 'branding-helper.html'
        },
      },
    },
    server: {
      https: {},
      open: 'branding-helper.html'
    },
    plugins: [
      mkcert(),
      viteSingleFile(),
      // creates an entry point that encodes all the artifacts as strings
      inlineAssetsPlugin(VIRTUAL_ID, {
        artifactsFolder: helperConfig.outDir,
        main: helperConfig.main,
        pluginDirectory: `plugins/${helperConfig.pluginName}`,
        // sanity check to ensure builder isn't included in bundle..it shouldn't
        omit: [
          helperConfig.builderOutput,
          basename(helperConfig.builderOutput)
        ],
        defaults
      })
    ]
  };
});