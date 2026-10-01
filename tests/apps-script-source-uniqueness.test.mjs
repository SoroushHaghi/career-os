import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function collectFiles(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...collectFiles(path));
    else if (stat.isFile() && name.endsWith('.gs')) out.push(path);
  }
  return out.sort();
}

test('Apps Script source has no duplicate named function declarations', () => {
  const files = collectFiles('apps/apps-script-runtime/src');
  const owners = new Map();

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const names = [...source.matchAll(/^function\s+([A-Za-z0-9_]+)\s*\(/gm)]
      .map((match) => match[1]);

    for (const name of names) {
      const previous = owners.get(name);
      assert.equal(
        previous,
        undefined,
        `duplicate Apps Script function ${name}: ${previous} and ${file}`
      );
      owners.set(name, file);
    }
  }

  assert.ok(owners.size >= 100, 'expected the complete runtime function set');
});
