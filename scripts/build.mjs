import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const htmlEntries = [
  'index.html', 'tools.html', 'contact.html', 'post-studio.html',
  'proposal-builder.html', 'text-repurposer.html', 'resume-builder.html',
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of htmlEntries) {
  const source = path.join(root, file);
  if (!existsSync(source)) throw new Error(`Missing page entry: ${file}`);
  await cp(source, path.join(dist, file));
}

// Copy assets into /dist/assets and preserve the original static pages at the site root.
if (existsSync(path.join(root, 'assets'))) {
  await cp(path.join(root, 'assets'), path.join(dist, 'assets'), { recursive: true });
}
if (existsSync(path.join(root, 'public'))) {
  for (const entry of await readdir(path.join(root, 'public'), { withFileTypes: true })) {
    const source = path.join(root, 'public', entry.name);
    const destination = path.join(dist, entry.name);
    await cp(source, destination, { recursive: true });
  }
}
console.log('Quans static front end built into ./dist');
