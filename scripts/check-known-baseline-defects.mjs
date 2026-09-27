import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = 'apps/apps-script-runtime/src/modules';

function collectGsFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...collectGsFiles(path));
    else if (stat.isFile() && name.endsWith('.gs')) out.push(path);
  }
  return out.sort();
}

const files = collectGsFiles(root);
const source = files.map((path) => readFileSync(path, 'utf8')).join('\n\n');

const start = source.indexOf('function enqueueImageJob_');
if (start < 0) {
  console.error('KNOWN-DEFECT CHECK FAILED: enqueueImageJob_ not found');
  process.exit(1);
}
const next = source.indexOf('\nfunction ', start + 20);
const block = source.slice(start, next > start ? next : undefined);

if (block.includes('markAudioSourceProcessingStatus_(')) {
  console.error('KNOWN-DEFECT CHECK FAILED: image enqueue still writes audio status');
  process.exit(1);
}
if (!block.includes('markImageSourceProcessingStatus_(')) {
  console.error('KNOWN-DEFECT CHECK FAILED: expected image status helper not found');
  process.exit(1);
}

console.log('KNOWN-DEFECT CHECK OK: image enqueue uses image status helper');
