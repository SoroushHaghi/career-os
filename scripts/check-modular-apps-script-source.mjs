import { existsSync } from 'node:fs';

const retired = 'apps/apps-script-runtime/src/baseline.gs';

if (existsSync(retired)) {
  console.error('MODULAR SOURCE CHECK FAILED: retired baseline.gs returned');
  process.exit(1);
}

console.log('MODULAR SOURCE CHECK OK: runtime source is module-only');
