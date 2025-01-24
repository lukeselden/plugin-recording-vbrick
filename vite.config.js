import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

import devConfig from './vite.json'

const config = {
  infinityUrl: "https://example.com",
  port: 5173,
  brandingPath: "/local-plugin",
  pluginName: "vbrick",
  ...devConfig
};

if (!config.infinityUrl || config.infinityUrl === "https://example.com") {
  throw new Error('FATAL: Update vite.json with a valid infinityUrl value');
}

const pluginPath = `${config.brandingPath}/branding/plugins/${config.pluginName}`;

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js'
      }
    }
  },
  server: {
    https: true,
    port: config.port,
    open: config.brandingPath + '/',
    proxy: {
      [`${pluginPath}/config.json`]: {
        bypass(req, res, options) {
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.write(JSON.stringify(config));
          res.end();
          return req.url;
        }
      },
      [`^${pluginPath}`]: {
        bypass(req, res, options) {
          return req.url.replace(pluginPath, '');
        }
      },
      [config.brandingPath]: {
        target: config.infinityUrl,
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: config.infinityUrl,
        changeOrigin: true,
        secure: false
      },
    }
  },
  plugins: [
    mkcert()
  ]
})
