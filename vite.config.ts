/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import mkcert from 'vite-plugin-mkcert'
import type { PluginConfig } from './src/config.js'
import type { ServerResponse } from 'node:http'

export interface BuildConfig extends Partial<PluginConfig> {
  port: number
  outDir: string
  infinity_url: string
  branding_path: string
  pluginName: string
  main: string
}

const devConfig = (await import('./vite.json', { with: { type: 'json' } })
  .then((module) => module.default)
  .catch(() => null)) as null | Partial<BuildConfig>

export const config: BuildConfig = {
  port: 5173,
  main: 'index.html',
  outDir: 'dist',
  pluginName: 'vbrick',
  infinity_url: '',
  branding_path: 'local-plugin',
  recording_type: 'sip',
  ...devConfig
}

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    updateDevConfig()
  }
  return {
    base: './',
    build: {
      target: 'esnext',
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: 'index.html'
        },
        output: {
          entryFileNames: 'assets/[name].js'
        }
      }
    },
    server: {
      https: {},
      port: config.port,
      open: config.branding_path + '/',
      cors: true,
      proxy: {
        [`^/${config.branding_path}/plugins/${config.pluginName}/index.html`]: {
          target: config.infinity_url,
          changeOrigin: true,
          secure: false
        },
        [config.branding_path]: {
          target: config.infinity_url,
          changeOrigin: true,
          secure: false
        },
        [`^/${config.branding_path}`]: {
          target: config.infinity_url,
          changeOrigin: true,
          secure: false
        },
        '/api': {
          target: config.infinity_url,
          changeOrigin: true,
          secure: false
        }
      }
    },
    plugins: [mkcert(), viteSingleFile(), overrideConfigPlugin()]
  }
})

/**
 * override defaults when serving for development purposes
 * @param cfg
 * @returns
 */
export function updateDevConfig(cfg: BuildConfig = config): BuildConfig {
  let infinityUrl = cfg.infinity_url
  const redirectUri = cfg.vbrick?.redirect_uri ?? ''
  const sipDomain = cfg.infinity?.sip_domain ?? ''
  // update infinity_url
  if (infinityUrl === 'https://pexip.example.com') {
    infinityUrl = ''
  }
  if (
    !infinityUrl &&
    URL.canParse(redirectUri) &&
    !redirectUri.includes('pexip.example.com')
  ) {
    console.warn(
      `No infinity_url set in vite.json, using configured vbrick redirect URL ${redirectUri}`
    )
    const url = new URL(redirectUri)
    cfg.infinity_url = infinityUrl = url.origin
    cfg.branding_path ||= url.pathname.replace('/oauth-redirect', '').slice(1)
  }
  if (!infinityUrl && sipDomain && sipDomain !== 'pexip.example.com') {
    console.warn(
      `No infinity_url set in vite.json, using infinity.sip_domain (${sipDomain})`
    )
    cfg.infinity_url = infinityUrl = `https://${sipDomain}`
  }
  if (!infinityUrl) {
    throw new Error(
      'FATAL No pexip url (infinity_url) specified in vite.json. Check README.md for instructions'
    )
  }
  return cfg
}

const overrideConfigPlugin = (): Plugin => ({
  name: 'configure-server',
  configureServer(server) {
    function sendJson(res: ServerResponse, data: any): void {
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.write(JSON.stringify(data))
      res.end()
    }
    async function overrideManifest(): Promise<
      | { ok: true; manifest: any }
      | { ok: false; statusCode: number; statusMessage: string }
    > {
      try {
        const url = new URL(
          `${config.branding_path}/branding/manifest.json`,
          config.infinity_url
        )
        const remoteResponse = await fetch(url)
        if (!remoteResponse.ok) {
          return {
            ok: false,
            statusCode: remoteResponse.status,
            statusMessage: remoteResponse.statusText
          }
        }
        const manifest = await remoteResponse.json()
        // add plugin entry to manifest
        manifest.plugins = [
          {
            src: '/index.html',
            sandboxValues: ['allow-same-origin', 'allow-popups', 'allow-forms']
          }
        ]

        return {
          ok: true,
          manifest
        }
      } catch (error) {
        return {
          ok: false,
          statusCode: 500,
          statusMessage: (error as Error)?.message ?? 'Unknown Error'
        }
      }
    }

    server.middlewares.use((req, res, next) => {
      switch (req.url) {
        case '/config.json':
        case `/${config.branding_path}/config.json`:
        case `/${config.branding_path}/branding/plugins/${config.pluginName}/config.json`:
          sendJson(res, config)
          return
        case `/${config.branding_path}/branding/manifest.json`:
          overrideManifest()
            .then((result) => {
              if (result.ok) {
                sendJson(res, result.manifest)
              } else {
                res.statusCode = result.statusCode
                res.statusMessage = result.statusMessage
                res.end()
              }
            })
            .catch((err) => {
              next(err)
            })
          return
        default:
          next()
      }
    })
  }
})
