const response = await fetch('./config.json')
const config: PluginConfig = await response.json()

export type RecordingType = "sip" | "rtmp";


export interface PluginConfig {
  /**
   * Method to do recording. Can be:
   * 'sip' - CLOUD REV ONLY - record using SIP
   * 'rtmp' - ON-PREM REV RTMP RECORDER ONLY - requires additional Vbrick software configured
   * @default "sip"
   */
  recording_type: RecordingType;
  /**
   * Vbrick Rev configuration
   */
  vbrick: {
    /**
     * Vbrick Rev URL
     * @example https://company.rev.vbrick.com
     */
    url: string;
    /**
     * OAuth Client ID
     * @see https://revdocs.vbrick.com/docs/create-an-api-key
     */
    client_id: string;
    /**
     * OAuth redirect uri. This must match the Vbrick Rev settings and plugin URI exactly
     * @example https://my.pexip.instance/branding-path/redirect
     */
    redirect_uri: string;
  },
  /**
   * Pexip infinity settings
   */
  infinity: {
    /**
     * Pexip sip domain
     * @example my.pexip.instance
     */
    sip_domain: string;
  },
  /**
   * Configuration for Vbrick RTMP Recorder
   * Only required if recording_type is set to "rtmp"
   */
  recorder: {
    /**
     * url of rtmp recording service
     * @example https://onprem-recorder.company.com
     */
    url: string;
    /**
     * route name to be passed to RTMP Recorder API - used for setting video metadata
     */
    route?: string;

    /**
     * Optional display name to use for participants list
     */
    display_name?: string;

    /**
     * whether to use 'rtmp' or 'auto' for the dial out protocol
     * @see {@link https://docs.pexip.com/api_client/api_rest.htm#dial}
     * @default "auto"
     */
    legacy_dialout_api?: boolean
    
  }
}

export { config }



