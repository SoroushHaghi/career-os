import { existsSync, readFileSync } from 'node:fs';

const stages = [
  '01_SYSTEM_BOUNDARIES.md',
  '02_REUSE_FIRST_BOUNDARIES.md',
  '03_DATA_MODEL.md',
  '04_STORAGE_MODEL.md',
  '05_PROCESSING_PIPELINE.md',
  '06_CONNECTORS.md',
  '07_PROCESSORS_PROVIDERS.md',
  '08_KNOWLEDGE_MODEL.md',
  '09_RUNTIME_OPERATIONS.md',
  '10_UI_PROJECTIONS.md',
  '11_DELIVERY_MIGRATION.md',
];

if (!existsSync('docs/vnext')) {
  console.log('VNEXT ARCHITECTURE CHECK SKIPPED: docs/vnext not present');
  process.exit(0);
}

for (const name of stages) {
  const path = `docs/vnext/${name}`;
  if (!existsSync(path)) { console.error(`missing architecture stage: ${path}`); process.exit(1); }
  const text = readFileSync(path, 'utf8');
  const status = text.match(/^Status:\s*(.+)$/mi)?.[1]?.trim();
  if (status !== 'APPROVED') {
    console.error(`architecture stage not approved: ${path} -> ${status ?? 'missing status'}`);
    process.exit(1);
  }
}

console.log('VNEXT ARCHITECTURE CHECK OK: stages 1-11 approved');
