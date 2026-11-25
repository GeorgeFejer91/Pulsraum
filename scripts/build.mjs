import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const entry = fileURLToPath(import.meta.resolve('@chenglou/pretext'));
const dist = path.dirname(entry);
const destination = path.resolve('assets/pretext');
await mkdir(destination, { recursive: true });
async function copyJavaScript(directory, relative = '') {
  for (const name of await readdir(directory)) {
    const source = path.join(directory, name);
    const target = path.join(relative, name);
    if ((await stat(source)).isDirectory()) await copyJavaScript(source, target);
    else if (name.endsWith('.js')) {
      await mkdir(path.dirname(path.join(destination, target)), { recursive: true });
      await cp(source, path.join(destination, target));
    }
  }
}
await copyJavaScript(dist);
await cp(path.resolve('node_modules/@chenglou/pretext/LICENSE'), path.join(destination, 'LICENSE'));
console.log(`Copied pinned Pretext browser modules from ${path.basename(entry)}.`);
