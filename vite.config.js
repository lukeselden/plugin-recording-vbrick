import fs from 'node:fs/promises';
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

const devConfig = JSON.parse(await fs.readFile('./vite.json', 'utf-8').catch(() => 'null'));
const srcConfig = JSON.parse(await fs.readFile('./src/config.json', 'utf-8').catch(() => 'null'));

if (srcConfig) {
  console.log('Using src/config.json config')
}
if (devConfig) {
  console.log('Overriding config with values in ./vite.json');
}

const config = {
  port: 5173,
  brandingPath: "/local-plugin",
  pluginName: "vbrick",
  ...srcConfig,
  ...devConfig
};

if (!config.infinityUrl || config.infinityUrl === "https://example.com") {
  console.warn(`No infinityUrl set in config files, using infinity.sip_domain (${config.infinity?.sip_domain})`);
  config.infinityUrl = config.infinity?.sip_domain;
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
