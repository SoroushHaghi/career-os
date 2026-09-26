import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync('config/defaults.json', 'utf8'));
JSON.parse(readFileSync('config/schema.json', 'utf8'));

const fail = (message) => { console.error(`CONFIG VALIDATION FAILED: ${message}`); process.exit(1); };

if (cfg?.privacy?.public_repo_contains_personal_data !== false) fail('public_repo_contains_personal_data must be false');
if (cfg?.privacy?.cloud_processing_requires_authorization !== true) fail('cloud processing must require authorization');
if (cfg?.monitoring?.public_monitor_private_details !== false) fail('public monitor private details must be false');
if (cfg?.processing?.unclassified_authorized_behavior !== 'register_and_hold') fail('authorized unclassified sources must register_and_hold');
if (!['dynamic','disabled'].includes(cfg?.runtime?.worker_mode)) fail('invalid worker_mode');

console.log('CONFIG VALIDATION OK');
