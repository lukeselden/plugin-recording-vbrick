import type { PluginConfig } from '../src/config.js'
import type { Artifacts } from './artifact-utils.js'
import {generatePackage, getConfigFromBrandingZip} from './packager.js';
import artifacts from './vite-bundled-artifacts.js'

const $ = <T = HTMLInputElement>(sel: string) => document.querySelector(sel) as T
function listen<E extends Event>(sel: string, evt: string, cb: (event: E) => any) {
  const el = $(sel)
  el?.addEventListener(evt, cb as any)
}
listen('#recording_type', 'change', (event: InputEvent) => {
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
function updateOAuth() {
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
  if (!file) return;
  getConfigFromBrandingZip(file)
    .then(config => {
      if (!config) return;
      console.log('Updating config from branding', config);
      setDefaults(config);
    }).catch(err => console.warn('error on getting config', err));
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
})

function formToConfig() {
  const fields = document.querySelectorAll(
    '#config_form :is(input,select)'
  ) as NodeListOf<HTMLInputElement | HTMLSelectElement>;
  const rawEntries = Array.from(fields).map((el) => [
    el.name,
    el.type === 'file' && el.files
      ? el.files[0]
      : el.value,
  ])

  let {
    branding: brandingZipFile,
    branding_path: brandingPath,
    update_version,
    vbrick_url,
    client_id,
    redirect_uri,
    pexip_url,
    sip_domain,
    recording_type,
    recorder_url,
    recorder_route,
    display_name,
    legacy_dialout_api,
  } = Object.fromEntries(rawEntries)

  if (!sip_domain) {
    sip_domain = new URL(pexip_url).hostname
  }

  const config: PluginConfig = {
    recording_type,
    vbrick: {
      url: vbrick_url,
      client_id,
      redirect_uri,
    },
    infinity: {
      sip_domain,
    },
    recorder: {
      url: recorder_url,
      route: recorder_route,
      display_name,
      legacy_dialout_api: /yes|true|checked/i.test(legacy_dialout_api),
    }
  };

  console.log('Plugin Config: ', config);

  return {
    config,
    brandingZipFile: brandingZipFile as File
  }
}

function setDefaults(defaults: Artifacts['defaults'] = {}) {
  const {redirect_uri = ''} = defaults.vbrick ?? {};
  if (URL.canParse(redirect_uri)) {
    const url = new URL(redirect_uri);
    defaults.infinity_url ||= url.origin;
    defaults.branding_path ||= url.pathname.replace('/oauth-redirect', '').slice(1);
  }
  const fields: ([id: string, type: string, val?: string])[] = [
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
  for (let [id, type, val] of fields) {
    if (!val) continue;
    const el = $(`#${id}`);
    if (!el.value || el instanceof HTMLSelectElement) {
      el.value = val;
    }
    const event = new CustomEvent(type);
    el.dispatchEvent(event);
  }
}
if (artifacts.defaults) {
  // setDefaults(artifacts.defaults);
}
