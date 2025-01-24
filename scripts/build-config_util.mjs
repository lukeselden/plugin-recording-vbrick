// @ts-check
import fs from 'node:fs/promises';
import { Zip, ZipDeflate } from 'fflate';
import { Blob } from 'node:buffer';
import path from 'node:path';

// base folder inside zip where content will go
const zipSubfolder = 'plugins/vbrick';

const DIST_DIRECTORY = './dist';
const HTML_PATH = './scripts/config_util_template.html';
const FFLATE_PATH = './node_modules/fflate/umd/index.js';
const PLUGIN_ZIP_PLACEHOLDER = '__$$PLUGIN_ZIP_BASE64$$__';
const FFLATE_CODE_PLACEHOLDER = '__$$FFLATE$$__';

const OUTPUT_PATH = 'build/config_util.html';

/**
 *
 * @param {string} directory
 * @returns {Promise<Blob>}
 */
async function createZip(directory) {
    return new Promise(async (resolve, reject) => {
        /** @type {Uint8Array[]} */
        const chunks = [];
        const zip = new Zip((err, data, final) => {
            if (err) return reject(err);
            chunks.push(data);
            if (final) resolve(new Blob(chunks, { type: 'application/x-zip-compressed' }));
        });

        try {
            await addFilesToZip(zip, directory);
            zip.end();
        } catch (error) {
            zip.terminate();
            reject(error);
        }
    });
}

async function addFilesToZip(zip, directory) {
    const files = await fs.readdir(directory, {
        withFileTypes: true,
        recursive: true,
    });
    for (let file of files) {
        if (!file.isFile()) continue;
        const { zipPath, content } = await asZipEntry(file, directory);

        const entry = new ZipDeflate(zipPath);
        zip.add(entry);
        entry.push(content, true);
    }
}

async function asZipEntry(file, directory) {
    const dir = path.relative(directory, file.parentPath);
    // make sure unix paths
    const zipPath = path
        .join(zipSubfolder, dir, file.name)
        .replaceAll(path.sep, path.posix.sep);

    const sourcePath = path.join(directory, dir, file.name);
    const content = await fs.readFile(sourcePath);

    return { zipPath, content };
}

async function zipToBase64(directory) {
    const blob = await createZip(directory);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return buffer.toString('base64');
}

const pluginZip = await zipToBase64(DIST_DIRECTORY);
const fflateJS = await fs.readFile(FFLATE_PATH, { encoding: 'utf-8' });

let configHtml = await fs.readFile(HTML_PATH, { encoding: 'utf-8' });

configHtml = configHtml
    .replace(PLUGIN_ZIP_PLACEHOLDER, () => pluginZip)
    .replace(FFLATE_CODE_PLACEHOLDER, () => fflateJS);

await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await fs.writeFile(OUTPUT_PATH, configHtml);

console.log(`Wrote plugin builder utility to ${OUTPUT_PATH}`);
