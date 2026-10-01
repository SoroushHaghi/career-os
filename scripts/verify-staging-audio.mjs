// Bounded continuation of an already-approved staging audio job.
// Never requeue a completed source or print transcript contents.
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const deadline = Date.now() + 20 * 60_000;
function call(action) {
  return JSON.parse(execFileSync(process.execPath,
    ['scripts/call-apps-script-admin.mjs'], {
      env: {...process.env, CAREER_OS_ADMIN_ACTION: action, CAREER_OS_ADMIN_PARAMS_JSON: ''},
      encoding: 'utf8', timeout: 400_000, maxBuffer: 1024 * 1024,
    })).result;
}
let health = call('health');
if (health.build?.channel !== 'staging') throw new Error('Expected staging runtime.');
console.log(JSON.stringify({build: health.build, audio: health.queues.audio}));
for (let round = 0; round < 45 && Date.now() < deadline; round++) {
  const jobs = health.queues.audio;
  if (!jobs.length) {
    const sources = call('sourceStatus').result.sources;
    const inventory = call('workspaceInventory').result;
    console.log(JSON.stringify({sources, inventory}));
    if (sources.some(s => s.audioStatus === 'ERROR') || !inventory.hasTranscriptArtifact) {
      throw new Error('Audio queue ended without a verified transcript artifact.');
    }
    console.log('STAGING_AUDIO_ARTIFACT_PASS');
    process.exit(0);
  }
  const due = Number(jobs[0].nextAttemptAt || 0);
  if (due > Date.now()) {
    if (due >= deadline) throw new Error('Provider retry exceeds this bounded verification window; queue preserved.');
    await delay(Math.min(30_000, due - Date.now()));
    health = call('health');
    round--;
    continue;
  }
  const before = JSON.stringify(jobs.map(j => [j.status, j.groqChunkIndex, j.attempts]));
  const result = call('workerOnce');
  console.log(JSON.stringify({round: round + 1, queues: result.queues}));
  health = call('health');
  const after = JSON.stringify(health.queues.audio.map(j => [j.status, j.groqChunkIndex, j.attempts]));
  // A worker holding ScriptLock may cause a safe no-op; avoid a busy loop.
  if (before === after) await delay(15_000);
}
throw new Error('Staging verification window exhausted; queued progress is preserved.');
