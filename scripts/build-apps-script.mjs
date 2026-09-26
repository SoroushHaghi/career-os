import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const sourcePath = resolve('apps/apps-script-runtime/src/baseline.gs');
const modulesDir = resolve('apps/apps-script-runtime/src/modules');
const outputPath = resolve('apps/apps-script-runtime/dist/Career_OS_Automation.gs');
const stagingCodePath = resolve('apps/apps-script-runtime/dist/staging/Code.gs');
const stagingManifestPath = resolve('apps/apps-script-runtime/dist/staging/appsscript.json');
const manifestSourcePath = resolve('apps/apps-script-runtime/appsscript.json');

if (!existsSync(sourcePath)) {
  console.error('Apps Script baseline source is not imported yet.');
  process.exit(2);
}

let gitSha = process.env.GITHUB_SHA;
if (!gitSha) {
  try {
    gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    gitSha = 'unknown';
  }
}

const moduleFiles = existsSync(modulesDir)
  ? readdirSync(modulesDir).filter((name) => name.endsWith('.gs')).sort()
  : [];

const bodyParts = [
  readFileSync(sourcePath, 'utf8'),
  ...moduleFiles.map((name) => readFileSync(join(modulesDir, name), 'utf8')),
];

const buildInfo = {
  gitSha,
  buildVersion: process.env.CAREER_OS_BUILD_VERSION || 'vnext-milestone-1',
  channel: process.env.CAREER_OS_BUILD_CHANNEL || 'development',
  schemaVersion: '0.1',
  generatedAt: process.env.CAREER_OS_BUILD_TIME || 'ci-or-local-build',
};

const header = [
  '// GENERATED FROM career-os. DO NOT EDIT IN APPS SCRIPT AS SOURCE OF TRUTH.',
  `// career_os_git_sha: ${gitSha}`,
  '// source: apps/apps-script-runtime/src/baseline.gs + src/modules/*.gs',
  `const CAREER_OS_BUILD_INFO = ${JSON.stringify(buildInfo)};`,
  '',
].join('\n');

const bundled = header + bodyParts.join('\n\n');
mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(dirname(stagingCodePath), { recursive: true });
writeFileSync(outputPath, bundled, 'utf8');
writeFileSync(stagingCodePath, bundled, 'utf8');
writeFileSync(stagingManifestPath, readFileSync(manifestSourcePath, 'utf8'), 'utf8');
console.log(`Built ${outputPath} from Git ${gitSha} with ${moduleFiles.length} module(s)`);
console.log(`Prepared staging package at ${dirname(stagingCodePath)}`);
