import { existsSync, readFileSync } from 'node:fs';

const path = 'apps/apps-script-runtime/src/baseline.gs';
if (!existsSync(path)) {
  console.log('KNOWN-DEFECT CHECK SKIPPED: baseline source not imported yet');
  process.exit(0);
}

const source = readFileSync(path, 'utf8');
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
