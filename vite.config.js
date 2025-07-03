// @ts-check
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite'
import mkcert from 'vite-plugin-mkcert'

const devConfig = JSON.parse(await fs.readFile('./vite.json', 'utf-8').catch(() => 'null'));

if (devConfig) {
  console.log('Overriding config with values in ./vite.json');
}

const config = {
  port: 5173,
  main: "index.html",
  outDir: "dist",
  branding_path: "local-plugin",
  pluginName: "vbrick",
  ...devConfig
};

if (!config.infinity_url || config.infinity_url === "https://pexip.example.com") {
  console.warn(`No infinity_url set in config files, using infinity.sip_domain (${config.infinity?.sip_domain})`);
  config.infinity_url = config.infinity?.sip_domain;
}

const pluginPath = `${config.branding_path}/branding/plugins/${config.pluginName}`;

const manifestPath = `${config.branding_path}/branding/manifest.json`;

const overrideConfigPlugin = () => ({
  name: 'configure-server',
  configureServer(server) {
    function sendJson(res, data) {
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.write(JSON.stringify(data));
      res.end();
    }
    async function overrideManifest() {
      try {
        const url = new URL(`${config.branding_path}/branding/manifest.json`, config.infinity_url);
        const remoteResponse = await fetch(url);
        if (!remoteResponse.ok) {
          return {
            ok: false,
            statusCode: remoteResponse.status,
            statusMessage: remoteResponse.statusMessage
          };
        }
        const manifest = await remoteResponse.json();
        // add plugin entry to manifest
        if (!Array.isArray(manifest.plugins)) {
          manifest.plugins = [];
        }
        manifest.plugins.push({
          src: '/index.html',
          sandboxValues: ['allow-same-origin', 'allow-popups', 'allow-forms']
        });
        return {
          ok: true,
          manifest
        };
      } catch (error) {
        return {
          ok: false,
          statusCode: 500,
          statusMessage: error.message
        };
      }
    }
    server.middlewares.use((req, res, next) => {
      switch (req.url) {
        case '/config.json':
        case `${pluginPath}/config.json`:
          sendJson(res, config);
          return;
        case manifestPath:
          overrideManifest()
            .then(result => {
              if (result.ok) {
                sendJson(res, result.manifest);
              } else {
                res.statusCode = result.statusCode;
                res.statusMessage = result.statusMessage;
                res.end();
              }
            });
          return;
        default:
          next();
      }
    });
  },
})

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, config.outDir);
const main = resolve(__dirname, config.main);


export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    outDir,
    rollupOptions: {
      input: {
        main
      },
      output: {
        entryFileNames: 'assets/[name].js'
      }
    }
  },
  server: {
    https: true,
    port: config.port,
    open: config.branding_path + '/',
    cors: true,
    proxy: {
      [config.branding_path]: {
        target: config.infinity_url,
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: config.infinity_url,
        changeOrigin: true,
        secure: false
      },
    }
  },
  plugins: [
    mkcert(),
    overrideConfigPlugin()
  ]
})
