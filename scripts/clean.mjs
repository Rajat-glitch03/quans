import { rm } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await rm(path.join(root, 'assets', 'js'), { recursive: true, force: true });
console.log('Generated front-end files removed.');
