const response = await fetch('./config.json')
const config: PluginConfig = await response.json()

export interface PluginConfig {
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
  }
  /**
   * Pexip infinity settings
   */
  infinity: {
    /**
     * Pexip sip domain
     * @example my.pexip.instance
     */
    sip_domain: string;
  }
}

export { config }
