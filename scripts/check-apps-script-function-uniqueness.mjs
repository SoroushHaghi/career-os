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
const owners = new Map();
const duplicates = [];

for (const path of files) {
  const source = readFileSync(path, 'utf8');
  const names = [...source.matchAll(/^function\s+([A-Za-z0-9_]+)\s*\(/gm)]
    .map((match) => match[1]);

  for (const name of names) {
    if (owners.has(name)) {
      duplicates.push({
        function: name,
        first: owners.get(name),
        second: path,
      });
    } else {
      owners.set(name, path);
    }
  }
}

if (duplicates.length) {
  console.error('APPS SCRIPT FUNCTION UNIQUENESS CHECK FAILED');
  for (const item of duplicates) {
    console.error(
      `${item.function}: ${item.first} <-> ${item.second}`
    );
  }
  process.exit(1);
}

console.log(
  `APPS SCRIPT FUNCTION UNIQUENESS CHECK OK: ${owners.size} functions across ${files.length} modules`
);
