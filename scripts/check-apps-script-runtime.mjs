import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const root = 'apps/apps-script-runtime';
const baseline = `${root}/src/baseline.gs`;
const legacyDir = `${root}/src/legacy`;

if (existsSync(legacyDir)) {
  const legacyParts = readdirSync(legacyDir).filter((name) => name.endsWith('.gs'));
  if (legacyParts.length) {
    console.error('APPS SCRIPT CHECK FAILED: incomplete legacy fragments must not be retained');
    process.exit(1);
  }
}

if (!existsSync(baseline)) {
  const manifest = JSON.parse(readFileSync(`${root}/baseline-manifest.json`, 'utf8'));
  if (manifest?.repository_import?.status !== 'BLOCKED_BY_CURRENT_TOOL_SAFETY_GATE') {
    console.error('APPS SCRIPT CHECK FAILED: baseline missing without a recorded blocker');
    process.exit(1);
  }
  console.log('APPS SCRIPT CHECK OK: baseline import is explicitly blocked and production remains unchanged');
  process.exit(0);
}

const source = readFileSync(baseline, 'utf8');
new vm.Script(source, { filename: baseline });

const sha256 = createHash('sha256').update(source, 'utf8').digest('hex');
if (existsSync(`${root}/baseline-import.json`)) {
  const imported = JSON.parse(readFileSync(`${root}/baseline-import.json`, 'utf8'));
  if (imported.sanitized_sha256 && imported.sanitized_sha256 !== sha256) {
    console.error('APPS SCRIPT CHECK FAILED: source hash differs from import manifest');
    process.exit(1);
  }
}

console.log(`APPS SCRIPT CHECK OK: syntax valid, SHA-256 ${sha256}`);
