import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync('config/defaults.json', 'utf8'));
JSON.parse(readFileSync('config/schema.json', 'utf8'));
const scopeSchema = JSON.parse(readFileSync('config/processing-scope.schema.json', 'utf8'));
const scopeExample = JSON.parse(readFileSync('config/processing-scope.example.json', 'utf8'));
const coreSchema = JSON.parse(readFileSync('packages/core/schema/core.schema.json', 'utf8'));
const providerPolicy = JSON.parse(readFileSync('config/provider-policy.defaults.json', 'utf8'));

const fail = (message) => { console.error(`CONFIG VALIDATION FAILED: ${message}`); process.exit(1); };

if (cfg?.privacy?.public_repo_contains_personal_data !== false) fail('public_repo_contains_personal_data must be false');
if (cfg?.privacy?.cloud_processing_requires_authorization !== true) fail('cloud processing must require authorization');
if (cfg?.monitoring?.public_monitor_private_details !== false) fail('public monitor private details must be false');
if (cfg?.processing?.unclassified_authorized_behavior !== 'register_and_hold') fail('authorized unclassified sources must register_and_hold');
if (!['dynamic','disabled'].includes(cfg?.runtime?.worker_mode)) fail('invalid worker_mode');
if (scopeExample.default_state !== 'UNKNOWN') fail('processing scope default_state must be UNKNOWN');
if (!scopeSchema?.properties?.default_state) fail('processing scope schema missing default_state');
if (providerPolicy.mode !== 'free_only') fail('provider policy mode must remain free_only for milestone 1');
const allowedModels = new Set(providerPolicy.allowed_models ?? []);
for (const [capability, route] of Object.entries(providerPolicy.routes ?? {})) {
  if (!route.primary || !allowedModels.has(route.primary)) fail(`provider route ${capability} primary is not allowlisted`);
  if (route.fallback && !allowedModels.has(route.fallback)) fail(`provider route ${capability} fallback is not allowlisted`);
}
for (const name of ['source','sourceVersion','context','artifact','evidenceUnit','processingRecord','learnerState','provenance','knowledgeEntity','knowledgeRelation']) {
  if (!coreSchema?.$defs?.[name]) fail(`core schema missing $defs.${name}`);
}

console.log('CONFIG VALIDATION OK');
