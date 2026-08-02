import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = path.join(repoRoot, 'src-tauri', 'gen', 'android');
const propertiesPath = path.join(androidRoot, 'keystore.properties');
const gradlePath = path.join(androidRoot, 'app', 'build.gradle.kts');
const required = process.argv.includes('--required');

function fail(message) {
  console.error(`Android release signing: ${message}`);
  process.exit(1);
}

function parseProperties(contents) {
  const properties = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    properties[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return properties;
}

if (!fs.existsSync(propertiesPath)) {
  if (required) {
    fail(
      `missing ${propertiesPath}. Create it with storeFile, storePassword, keyPassword and keyAlias before building a release APK.`,
    );
  }
  console.log(
    `Android release signing: ${propertiesPath} not found; release signing is not configured.`,
  );
  process.exit(0);
}

if (!fs.existsSync(gradlePath)) {
  fail(
    `missing ${gradlePath}. Run the Android project initialization from the repository root first.`,
  );
}

const properties = parseProperties(fs.readFileSync(propertiesPath, 'utf8'));
const storeFileValue = properties.storeFile;
const storePassword = properties.storePassword || properties.password;
const keyPassword = properties.keyPassword || properties.password;

for (const [name, value] of Object.entries({
  storeFile: storeFileValue,
  storePassword,
  keyPassword,
  keyAlias: properties.keyAlias,
})) {
  if (!value) fail(`${name} is missing from ${propertiesPath}.`);
}

const storeFile = path.isAbsolute(storeFileValue)
  ? storeFileValue
  : path.resolve(androidRoot, storeFileValue);
if (!fs.existsSync(storeFile)) fail(`keystore file does not exist: ${storeFile}`);

let gradle = fs.readFileSync(gradlePath, 'utf8');
const missingImports = [];
if (!gradle.includes('import java.io.FileInputStream')) {
  missingImports.push('import java.io.FileInputStream');
}
if (!gradle.includes('import java.util.Properties')) {
  missingImports.push('import java.util.Properties');
}
if (missingImports.length > 0) {
  gradle = `${missingImports.join('\n')}\n\n${gradle}`;
}

if (!gradle.includes('create("release")')) {
  const buildTypesIndex = gradle.indexOf('    buildTypes {');
  if (buildTypesIndex < 0) fail(`could not find buildTypes in ${gradlePath}.`);

  const signingConfig = `    signingConfigs {\n        create("release") {\n            val keystorePropertiesFile = rootProject.file("keystore.properties")\n            val keystoreProperties = Properties()\n            keystoreProperties.load(FileInputStream(keystorePropertiesFile))\n            keyAlias = keystoreProperties["keyAlias"] as String\n            keyPassword = (keystoreProperties["keyPassword"] ?: keystoreProperties["password"]) as String\n            storeFile = file(keystoreProperties["storeFile"] as String)\n            storePassword = (keystoreProperties["storePassword"] ?: keystoreProperties["password"]) as String\n        }\n    }\n`;
  gradle = `${gradle.slice(0, buildTypesIndex)}${signingConfig}${gradle.slice(buildTypesIndex)}`;
}

const releaseMarker = '        getByName("release") {\n';
if (!gradle.includes('signingConfig = signingConfigs.getByName("release")')) {
  const releaseIndex = gradle.indexOf(releaseMarker);
  if (releaseIndex < 0) fail(`could not find the release build type in ${gradlePath}.`);
  const insertAt = releaseIndex + releaseMarker.length;
  gradle = `${gradle.slice(0, insertAt)}            signingConfig = signingConfigs.getByName("release")\n${gradle.slice(insertAt)}`;
}

fs.writeFileSync(gradlePath, gradle);
console.log(`Android release signing configured with ${path.basename(storeFile)}.`);
