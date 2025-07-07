import type { PluginConfig, RecordingType } from '../src/config.js'
import {generatePackage, getConfigFromBrandingZip} from './packager.js';
import type { Artifacts } from './virtual-bundle.js'
import artifacts from './vite-bundled-artifacts.js'

const $ = <T = HTMLInputElement>(sel: string): T => document.querySelector(sel) as T
function listen<K extends keyof HTMLElementEventMap>(sel: string, evt: K, cb: (event: HTMLElementEventMap[K]) => any): void {
  const el = $(sel)
  el?.addEventListener(evt, cb)
}
listen('#recording_type', 'change', (event) => {
  const el = event.target as HTMLInputElement;
  const isRTMP = el.value === 'rtmp'
  $('#config_form').classList.toggle('is-rtmp', isRTMP)
})
listen('#pexip_url', 'input', (event) => {
  const { value } = event.target as HTMLInputElement;
  if (URL.canParse(value)) {
    $('#sip_domain').placeholder = new URL(value).hostname
  }
  updateOAuth()
})
listen('#branding_path', 'input', (event) => {
  updateOAuth()
})
function updateOAuth(): void {
  const { value: baseUrl } = $('#pexip_url')
  const { value: path = 'webapp3' } = $('#branding_path')
  if (URL.canParse(baseUrl)) {
    const url = new URL(path, baseUrl)
    url.pathname = url.pathname.replace(/\/*$/, '/oauth-redirect')
    $('#redirect_uri').value = url.toString()
  }
}
listen('#branding', 'change', (event) => {
  const file = $<HTMLInputElement>('#branding').files?.[0];
  if (file == null) return;
  getConfigFromBrandingZip(file)
    .then(config => {
      if (config == null) return;
      console.log('Updating config from branding', config);
      setDefaults(config);
    }).catch(err => { console.warn('error on getting config', err) });
})
listen('#config_form', 'submit', (event: SubmitEvent) => {
  event.preventDefault()
  const {config, brandingZipFile} = formToConfig();
  generatePackage(brandingZipFile, config)
    .then(file => {
      const url = URL.createObjectURL(file)
      const anchor = $<HTMLAnchorElement>('#download_link')
      anchor.setAttribute('href', url);
      anchor.innerText = `Download ${file.name}`;
      anchor.download = file.name;
    })
    .catch(err => { console.warn('error on generating config', err) });
})

function isBlank<T = unknown>(val: T): val is Exclude<T, NonNullable<T>> {
  return val == null || val === '';
}

function formToConfig(): {config: PluginConfig, brandingZipFile: File} {
  const fields: NodeListOf<HTMLInputElement | HTMLSelectElement> = document.querySelectorAll('#config_form :is(input,select)')
  const rawEntries = Array.from(fields).map((el) => [
    el.name,
    el.type === 'file' && el.files != null
      ? el.files[0]
      : el.value,
  ])

  const data: Record<string, string> = Object.fromEntries(rawEntries);

  data.sip_domain ||= new URL(data.pexip_url).hostname

  const config: PluginConfig = {
    recording_type: data.recording_type as RecordingType,
    vbrick: {
      url: data.vbrick_url,
      client_id: data.client_id,
      redirect_uri: data.redirect_uri,
    },
    infinity: {
      sip_domain: data.sip_domain,
    },
    recorder: {
      url: data.recorder_url,
      route: data.recorder_route,
      display_name: data.display_name,
      legacy_dialout_api: /yes|true|checked/i.test(data.legacy_dialout_api),
    }
  };

  console.log('Plugin Config: ', config);

  return {
    config,
    brandingZipFile: data.branding as any as File
  }
}

function setDefaults(defaults: Artifacts['defaults'] = {}): void {
  const {redirect_uri: redirectUri = ''} = defaults.vbrick ?? {};
  if (URL.canParse(redirectUri)) {
    const url = new URL(redirectUri);
    defaults.infinity_url ||= url.origin;
    defaults.branding_path ||= url.pathname.replace('/oauth-redirect', '').slice(1);
  }
  const fields: Array<[id: string, type: string, val?: string]> = [
    ['pexip_url', 'input', defaults.infinity_url],
    ['recording_type', 'change', defaults.recording_type],
    ['branding_path', 'input', defaults.branding_path],
    ['vbrick_url', 'change', defaults.vbrick?.url],
    ['client_id', 'change', defaults.vbrick?.client_id],
    ['redirect_uri', 'change', defaults.vbrick?.redirect_uri],
    ['recorder_url', 'change', defaults.recorder?.url],
    ['recorder_route', 'change', defaults.recorder?.route],
    ['sip_domain', 'change', defaults.infinity?.sip_domain]
  ]
  for (const [id, type, val] of fields) {
    if (isBlank(val)) continue;
    const el = $(`#${id}`);
    if (isBlank(el.value) || el instanceof HTMLSelectElement) {
      el.value = val;
    }
    const event = new CustomEvent(type);
    el.dispatchEvent(event);
  }
}
if (artifacts.defaults != null && typeof artifacts.defaults === 'object') {
  setDefaults(artifacts.defaults);
}
