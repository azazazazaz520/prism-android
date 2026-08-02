import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apkRoot = path.join(
  repoRoot,
  'src-tauri',
  'gen',
  'android',
  'app',
  'build',
  'outputs',
  'apk',
);
const outputName = 'prism.apk';

function findReleaseApks(directory) {
  if (!fs.existsSync(directory)) return [];

  const matches = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...findReleaseApks(entryPath));
    } else if (entry.isFile() && /app-.+-release\.apk$/i.test(entry.name)) {
      matches.push(entryPath);
    }
  }
  return matches;
}

const candidates = findReleaseApks(apkRoot).sort(
  (left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs,
);
if (candidates.length === 0) {
  console.error(`No release APK found under ${apkRoot}`);
  process.exit(1);
}

const source = candidates[0];
const target = path.join(path.dirname(source), outputName);
fs.copyFileSync(source, target);
console.log(`APK renamed to ${target}`);
