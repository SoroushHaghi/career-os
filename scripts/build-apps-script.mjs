import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const modulesDir = resolve('apps/apps-script-runtime/src/modules');
const outputPath = resolve('apps/apps-script-runtime/dist/Career_OS_Automation.gs');
const manifestSourcePath = resolve('apps/apps-script-runtime/appsscript.json');
const profileConfigPath = resolve('config/apps-script-build-profiles.json');

const profileConfig = JSON.parse(readFileSync(profileConfigPath, 'utf8'));
const buildProfile = process.env.CAREER_OS_BUILD_PROFILE || profileConfig.default_profile || 'staging';
const profile = profileConfig.profiles?.[buildProfile];

if (!profile) {
  console.error(`Unknown Apps Script build profile: ${buildProfile}`);
  process.exit(2);
}

const packageDir = resolve(`apps/apps-script-runtime/dist/${buildProfile}`);
const packageCodePath = join(packageDir, 'Code.gs');
const packageManifestPath = join(packageDir, 'appsscript.json');

let gitSha = process.env.GITHUB_SHA;
if (!gitSha) {
  try {
    gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    gitSha = 'unknown';
  }
}

function collectGsFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];

  for (const name of readdirSync(root).sort()) {
    const full = join(root, name);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      out.push(...collectGsFiles(full));
      continue;
    }

    if (stat.isFile() && name.endsWith('.gs')) {
      out.push(full);
    }
  }

  return out.sort((a, b) =>
    relative(modulesDir, a).localeCompare(relative(modulesDir, b))
  );
}

const excluded = new Set((profile.exclude ?? []).map(String));

const moduleFiles = collectGsFiles(modulesDir).filter((path) => {
  const rel = relative(modulesDir, path).replaceAll('\\', '/');
  return !excluded.has(rel);
});

if (!moduleFiles.length) {
  console.error('Apps Script runtime has no repository modules after profile filtering.');
  process.exit(2);
}

const processingContract = readFileSync('packages/core/src/processing-identity.mjs', 'utf8').replace(/^export /gm, '');
const bodyParts = moduleFiles.map((path) => readFileSync(path, 'utf8'));

const buildInfo = {
  gitSha,
  buildVersion: process.env.CAREER_OS_BUILD_VERSION || 'vnext-milestone-1',
  channel: process.env.CAREER_OS_BUILD_CHANNEL || buildProfile,
  buildProfile,
  schemaVersion: '0.1',
  generatedAt: process.env.CAREER_OS_BUILD_TIME || 'ci-or-local-build',
};

const header = [
  '// GENERATED FROM career-os. DO NOT EDIT IN APPS SCRIPT AS SOURCE OF TRUTH.',
  `// career_os_git_sha: ${gitSha}`,
  `// build_profile: ${buildProfile}`,
  '// source: apps/apps-script-runtime/src/modules/**/*.gs',
  `const CAREER_OS_BUILD_INFO = ${JSON.stringify(buildInfo)};`,
  '',
].join('\n');

const bundled = header + processingContract + '\n' + bodyParts.join('\n\n');
mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(packageDir, { recursive: true });
writeFileSync(outputPath, bundled, 'utf8');
writeFileSync(packageCodePath, bundled, 'utf8');
writeFileSync(packageManifestPath, readFileSync(manifestSourcePath, 'utf8'), 'utf8');

const lineCount = bundled.split(/\r?\n/).length;

console.log(
  `Built ${outputPath} from Git ${gitSha} using profile ${buildProfile} with ${moduleFiles.length} module(s), ${lineCount} lines`
);
console.log(
  moduleFiles.map((path) => relative(modulesDir, path)).join('\n')
);
console.log(`Prepared ${buildProfile} package at ${packageDir}`);
