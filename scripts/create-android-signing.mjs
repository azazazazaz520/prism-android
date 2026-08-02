import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(repoRoot, 'src-tauri', 'gen', 'android');
const propertiesPath = path.join(androidRoot, 'keystore.properties');
const keyDirectory = path.join(os.homedir(), '.prism-android');
const keystorePath = path.join(keyDirectory, 'upload-keystore.jks');
const alias = 'upload';

if (!fs.existsSync(androidRoot)) {
  console.error(
    'Android generated project not found. Run the Android initialization from the repository root first.',
  );
  process.exit(1);
}

if (fs.existsSync(keystorePath) || fs.existsSync(propertiesPath)) {
  console.error(
    'An Android signing key or configuration already exists; refusing to overwrite it.',
  );
  process.exit(1);
}

const password = crypto.randomBytes(24).toString('hex');
fs.mkdirSync(keyDirectory, { recursive: true });

const keytool = process.platform === 'win32' ? 'keytool.exe' : 'keytool';
const result = spawnSync(
  keytool,
  [
    '-genkeypair',
    '-v',
    '-keystore',
    keystorePath,
    '-storetype',
    'JKS',
    '-storepass',
    password,
    '-keypass',
    password,
    '-alias',
    alias,
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-dname',
    'CN=Prism Android, OU=Prism, O=Prism, L=Unknown, ST=Unknown, C=CN',
    '-noprompt',
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(`Could not run ${keytool}: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

const properties = [
  `storeFile=${keystorePath.split(path.sep).join('/')}`,
  `storePassword=${password}`,
  `keyPassword=${password}`,
  `keyAlias=${alias}`,
  '',
].join('\n');
fs.writeFileSync(propertiesPath, properties, { encoding: 'utf8', flag: 'wx' });

console.log(`Created Android signing keystore at ${keystorePath}`);
console.log(`Created local Gradle signing configuration at ${propertiesPath}`);
