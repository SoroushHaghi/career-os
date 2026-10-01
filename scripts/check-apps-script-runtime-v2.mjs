import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import vm from 'node:vm';

const sourceRoot = 'apps/apps-script-runtime/src/modules';

function collectGsFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const name of readdirSync(root).sort()) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...collectGsFiles(path));
    else if (stat.isFile() && name.endsWith('.gs')) out.push(path);
  }
  return out.sort();
}

const files = collectGsFiles(sourceRoot);
if (!files.length) {
  console.error('APPS SCRIPT RUNTIME CHECK FAILED: repository modules are missing');
  process.exit(1);
}

const source = files.map((path) => readFileSync(path, 'utf8')).join('\n\n');
new vm.Script(source, { filename: 'career-os-apps-script-modules.gs' });

const sha256 = createHash('sha256').update(source, 'utf8').digest('hex');

if (!/function\s+checkDriveChanges\s*\(/.test(source)) {
  console.error('APPS SCRIPT RUNTIME CHECK FAILED: scanner entrypoint is missing');
  process.exit(1);
}

if (!/function\s+processCareerOsQueues\s*\(/.test(source)) {
  console.error('APPS SCRIPT RUNTIME CHECK FAILED: worker entrypoint is missing');
  process.exit(1);
}

if (!/const\s+CAREER_OS_CONFIG\s*=/.test(source)) {
  console.error('APPS SCRIPT RUNTIME CHECK FAILED: runtime config is missing');
  process.exit(1);
}

console.log(
  `APPS SCRIPT RUNTIME CHECK OK: ${files.length} modules, syntax valid, module-set SHA-256 ${sha256}`
);
