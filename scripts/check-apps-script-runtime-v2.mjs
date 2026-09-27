import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const root = 'apps/apps-script-runtime';
const baseline = `${root}/src/baseline.gs`;
const legacyDir = `${root}/src/legacy`;

if (existsSync(legacyDir)) {
  const parts = readdirSync(legacyDir).filter((name) => name.endsWith('.gs'));
  if (parts.length) {
    console.error('APPS SCRIPT RUNTIME CHECK FAILED: incomplete legacy fragments are present');
    process.exit(1);
  }
}

if (!existsSync(baseline)) {
  console.error('APPS SCRIPT RUNTIME CHECK FAILED: repository baseline is missing');
  process.exit(1);
}

const source = readFileSync(baseline, 'utf8');
new vm.Script(source, { filename: baseline });

const sha256 = createHash('sha256').update(source, 'utf8').digest('hex');

if (!/function\s+checkDriveChanges\s*\(/.test(source)) {
  console.error('APPS SCRIPT RUNTIME CHECK FAILED: scanner entrypoint is missing');
  process.exit(1);
}

if (!/function\s+processCareerOsQueues\s*\(/.test(source)) {
  console.error('APPS SCRIPT RUNTIME CHECK FAILED: worker entrypoint is missing');
  process.exit(1);
}

console.log(`APPS SCRIPT RUNTIME CHECK OK: syntax valid, current source SHA-256 ${sha256}`);
