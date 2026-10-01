import { readdirSync } from 'node:fs';

const dir = 'apps/apps-script-runtime/dist/staging';
const expected = ['Code.gs', 'appsscript.json'];
const actual = readdirSync(dir).sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error('APPS SCRIPT DEPLOYMENT SURFACE CHECK FAILED');
  console.error('Expected: ' + expected.join(', '));
  console.error('Actual: ' + actual.join(', '));
  process.exit(1);
}

console.log('APPS SCRIPT DEPLOYMENT SURFACE CHECK OK: Code.gs + appsscript.json');
