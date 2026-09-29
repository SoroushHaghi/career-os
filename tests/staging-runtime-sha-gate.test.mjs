import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(
  'scripts/wait-for-staging-build.mjs',
  'utf8'
);
const workflow = readFileSync(
  '.github/workflows/knowledge-compiler-staging-acceptance.yml',
  'utf8'
);

test('staging build wait compares exact full Git SHA and never prints health payload', () => {
  assert.match(script, /\^\[0-9a-f\]\{40\}\$/i);
  assert.match(script, /health\?\.build\?\.gitSha/);
  assert.match(script, /lastSha === targetSha/);
  assert.doesNotMatch(script, /console\.log\(raw\)/);
  assert.doesNotMatch(script, /JSON\.stringify\(health\)/);
});

test('knowledge acceptance waits for deployed runtime before provider configuration', () => {
  const waitIndex = workflow.indexOf(
    'Wait for exact staging runtime Git SHA'
  );
  const configureIndex = workflow.indexOf(
    'Configure free-only Knowledge Compiler'
  );
  const compileIndex = workflow.indexOf(
    'Run real staging session Knowledge Compiler'
  );

  assert.ok(waitIndex >= 0);
  assert.ok(configureIndex > waitIndex);
  assert.ok(compileIndex > configureIndex);
  assert.match(
    workflow,
    /CAREER_OS_EXPECTED_RUNTIME_SHA: \$\{\{ github\.sha \}\}/
  );
});
