// this comes from the vite plugin in vite-plugin-bundler.ts that consolidates the dist folder assets
// @ts-expect-error -- virtually created
import encodedArtifacts from 'virtual:bundle'
import { decodeArtifacts } from './artifact-utils.js'

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- virtual bundle has no types
export default decodeArtifacts(encodedArtifacts)
