import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const path = 'apps/apps-script-runtime/dist/Career_OS_Automation.gs';
const source = readFileSync(path, 'utf8');

const context = vm.createContext({ console });
new vm.Script(source, { filename: path }).runInContext(context);

if (typeof context.runCareerOsVnextShadowSelfTest !== 'function') {
  console.error('SHADOW TEST FAILED: runtime self-test function is missing');
  process.exit(1);
}

const result = context.runCareerOsVnextShadowSelfTest();
if (!result || result.ok !== true) {
  console.error('SHADOW TEST FAILED: ' + JSON.stringify(result));
  process.exit(1);
}

console.log('SHADOW TEST OK: ' + JSON.stringify(result));
