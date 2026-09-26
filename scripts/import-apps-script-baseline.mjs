import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/import-apps-script-baseline.mjs <source.gs>');
  process.exit(2);
}

const outputPath = resolve('apps/apps-script-runtime/src/baseline.gs');
const manifestPath = resolve('apps/apps-script-runtime/baseline-import.json');

let source = readFileSync(resolve(inputPath), 'utf8');

const replacements = String(process.env.CAREER_OS_SANITIZE_TOKENS ?? '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean)
  .map((pair) => {
    const index = pair.indexOf('=');
    if (index < 1) throw new Error('CAREER_OS_SANITIZE_TOKENS must use OLD=NEW pairs');
    return [pair.slice(0, index), pair.slice(index + 1)];
  });

for (const [from, to] of replacements) source = source.split(from).join(to);

const forbidden = [
  ['Google API key', /AIza[0-9A-Za-z_-]{20,}/g],
  ['OpenAI-style key', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ['Drive URL', /https?:\/\/drive\.google\.com\//g],
  ['Email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['Windows user path', /[A-Za-z]:\\Users\\[^\\\s]+\\/g],
  ['Private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];

const failures = [];
for (const [name, re] of forbidden) {
  re.lastIndex = 0;
  if (re.test(source)) failures.push(name);
}

if (failures.length) {
  console.error('IMPORT BLOCKED: public-safety scan found: ' + failures.join(', '));
  process.exit(1);
}

const sha256 = createHash('sha256').update(source, 'utf8').digest('hex');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, source, 'utf8');
writeFileSync(manifestPath, JSON.stringify({
  schema_version: '0.1',
  imported_at: new Date().toISOString(),
  source_file: '<local-input>',
  sanitized_sha256: sha256,
  replacements_applied: replacements.length,
  public_safety_scan: 'PASS',
}, null, 2) + '\n', 'utf8');

console.log(`Imported public-safe Apps Script baseline -> ${outputPath}`);
console.log(`SHA-256: ${sha256}`);
