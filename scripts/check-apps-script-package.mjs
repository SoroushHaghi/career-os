import vm from 'node:vm';
import { existsSync, readFileSync } from 'node:fs';

const profile = process.env.CAREER_OS_BUILD_PROFILE || 'staging';
const codePath = `apps/apps-script-runtime/dist/${profile}/Code.gs`;
const manifestPath = `apps/apps-script-runtime/dist/${profile}/appsscript.json`;

if (!existsSync(codePath) || !existsSync(manifestPath)) {
  console.error(
    `APPS SCRIPT PACKAGE CHECK FAILED: ${profile} package is incomplete`
  );
  process.exit(1);
}

const content = readFileSync(codePath, 'utf8');
new vm.Script(content, { filename: codePath });

const header = content.split(/\r?\n/).slice(0, 8).join('\n');
if (!header.includes('GENERATED FROM career-os')) {
  console.error('APPS SCRIPT PACKAGE CHECK FAILED: provenance header missing');
  process.exit(1);
}

if (!header.includes(`build_profile: ${profile}`)) {
  console.error(
    `APPS SCRIPT PACKAGE CHECK FAILED: expected build profile ${profile}`
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.runtimeVersion !== 'V8') {
  console.error('APPS SCRIPT PACKAGE CHECK FAILED: runtimeVersion must be V8');
  process.exit(1);
}

const driveService = manifest.dependencies?.enabledAdvancedServices?.find(
  (service) => service.userSymbol === 'Drive' && service.version === 'v3'
);
if (!driveService) {
  console.error('APPS SCRIPT PACKAGE CHECK FAILED: Drive advanced service v3 missing');
  process.exit(1);
}

if (profile === 'dashboard') {
  if (manifest.webapp?.access !== 'MYSELF') {
    console.error(
      'APPS SCRIPT PACKAGE CHECK FAILED: dashboard web app must be MYSELF-only'
    );
    process.exit(1);
  }

  if (manifest.webapp?.executeAs !== 'USER_DEPLOYING') {
    console.error(
      'APPS SCRIPT PACKAGE CHECK FAILED: dashboard must execute as USER_DEPLOYING'
    );
    process.exit(1);
  }

  if (!content.includes('function doGet()')) {
    console.error(
      'APPS SCRIPT PACKAGE CHECK FAILED: dashboard doGet() missing'
    );
    process.exit(1);
  }
}

if (profile === 'production') {
  for (const forbidden of [
    'function runCareerOsCutoverPhase1()',
    'function runCareerOsVnextStagingMetadataProbe()',
    'function runCareerOsVnextStagingLiveQueueProbe()',
    'function runCareerOsVnextStagingRegistryProbe()',
  ]) {
    if (content.includes(forbidden)) {
      console.error(
        `APPS SCRIPT PACKAGE CHECK FAILED: production contains staging-only function ${forbidden}`
      );
      process.exit(1);
    }
  }
}

const lineCount = content.split(/\r?\n/).length;
console.log(
  `APPS SCRIPT PACKAGE CHECK OK: profile=${profile}, lines=${lineCount}`
);
