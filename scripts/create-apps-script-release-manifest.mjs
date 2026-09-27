import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const codePath = resolve('apps/apps-script-runtime/dist/staging/Code.gs');
const manifestPath = resolve('apps/apps-script-runtime/dist/staging/appsscript.json');
const outPath = resolve('apps/apps-script-runtime/dist/release-manifest.json');

for (const path of [codePath, manifestPath]) {
  if (!existsSync(path)) {
    console.error('RELEASE MANIFEST FAILED: missing ' + path);
    process.exit(1);
  }
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const moduleDir = resolve('apps/apps-script-runtime/src/modules');
function collect(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + name.name : name.name;
    if (name.isDirectory()) out.push(...collect(resolve(dir, name.name), rel));
    else if (name.isFile() && name.name.endsWith('.gs')) out.push(rel);
  }
  return out.sort();
}

const gitSha = process.env.GITHUB_SHA || 'local';
const manifest = {
  schemaVersion: '0.1',
  gitSha,
  buildVersion: process.env.CAREER_OS_BUILD_VERSION || 'vnext-milestone-1',
  channel: process.env.CAREER_OS_BUILD_CHANNEL || 'development',
  generatedAt: process.env.CAREER_OS_BUILD_TIME || new Date().toISOString(),
  deploymentSurface: ['Code.gs', 'appsscript.json'],
  sha256: {
    code: sha256(codePath),
    appsscript: sha256(manifestPath),
  },
  moduleCount: collect(moduleDir).length,
  modules: collect(moduleDir),
  productionChanged: false,
};

writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('RELEASE MANIFEST OK: ' + outPath);
