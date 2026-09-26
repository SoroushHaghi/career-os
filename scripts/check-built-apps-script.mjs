import vm from 'node:vm';
import { existsSync, readFileSync } from 'node:fs';

const path = 'apps/apps-script-runtime/dist/Career_OS_Automation.gs';
const stagingCode = 'apps/apps-script-runtime/dist/staging/Code.gs';
const stagingManifest = 'apps/apps-script-runtime/dist/staging/appsscript.json';
if (!existsSync(path)) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: generated bundle is missing');
  process.exit(1);
}

const content = readFileSync(path, 'utf8');
new vm.Script(content, { filename: path });
const lines = content.split(/\r?\n/).slice(0, 6).join('\n');

if (!lines.includes('GENERATED FROM career-os')) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: repository provenance header missing');
  process.exit(1);
}
if (!/career_os_git_sha:\s*[0-9a-f]{7,40}/i.test(lines)) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: Git SHA header missing');
  process.exit(1);
}

if (!content.includes('function runCareerOsVnextShadowSelfTest()')) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: vNext shadow bridge missing');
  process.exit(1);
}

if (!existsSync(stagingCode) || !existsSync(stagingManifest)) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: staging package is incomplete');
  process.exit(1);
}

const stagingContent = readFileSync(stagingCode, 'utf8');
new vm.Script(stagingContent, { filename: stagingCode });

const manifest = JSON.parse(readFileSync(stagingManifest, 'utf8'));
if (manifest.runtimeVersion !== 'V8') {
  console.error('BUILT APPS SCRIPT CHECK FAILED: staging manifest runtimeVersion must be V8');
  process.exit(1);
}

const driveService = manifest.dependencies?.enabledAdvancedServices?.find(
  (service) => service.userSymbol === 'Drive' && service.version === 'v3'
);
if (!driveService) {
  console.error('BUILT APPS SCRIPT CHECK FAILED: Drive advanced service v3 is missing');
  process.exit(1);
}

console.log('BUILT APPS SCRIPT CHECK OK');
