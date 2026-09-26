import { existsSync, readFileSync } from 'node:fs';

const path = 'apps/apps-script-runtime/dist/Career_OS_Automation.gs';
if (!existsSync(path)) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: generated bundle is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/).slice(0, 6).join('\n');

if (!lines.includes('GENERATED FROM career-os')) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: repository provenance header missing');
  process.exit(1);
}
if (!/career_os_git_sha:\s*[0-9a-f]{7,40}/i.test(lines)) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: Git SHA header missing');
  process.exit(1);
}

console.log('BUILT APPS SCRIPT CHECK OK');
