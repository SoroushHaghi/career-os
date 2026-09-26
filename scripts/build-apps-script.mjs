import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve('apps/apps-script-runtime/src/baseline.gs');
const outputPath = resolve('apps/apps-script-runtime/dist/Career_OS_Automation.gs');

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

const body = readFileSync(sourcePath, 'utf8');
const header = [
  '// GENERATED FROM career-os. DO NOT EDIT IN APPS SCRIPT AS SOURCE OF TRUTH.',
  `// career_os_git_sha: ${gitSha}`,
  '// source: apps/apps-script-runtime/src/baseline.gs',
  '',
].join('\n');

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, header + body, 'utf8');
console.log(`Built ${outputPath} from Git ${gitSha}`);
