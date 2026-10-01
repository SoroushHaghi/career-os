// Wait for the staging Apps Script admin/runtime surface to report the exact
// vnext Git SHA that triggered the acceptance workflow. Do not print private
// queue/source payloads from the health response.
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const targetSha = String(
  process.env.CAREER_OS_EXPECTED_RUNTIME_SHA ||
  process.env.GITHUB_SHA ||
  ''
).trim();

if (!/^[0-9a-f]{40}$/i.test(targetSha)) {
  throw new Error('CAREER_OS_EXPECTED_RUNTIME_SHA/GITHUB_SHA must be a full Git SHA.');
}

const deadline =
  Date.now() +
  Number(process.env.CAREER_OS_RUNTIME_WAIT_MS || 8 * 60_000);

let attempt = 0;
let lastSha = '';

while (Date.now() < deadline) {
  attempt += 1;

  try {
    const raw = execFileSync(
      process.execPath,
      ['scripts/call-apps-script-admin.mjs'],
      {
        env: {
          ...process.env,
          CAREER_OS_ADMIN_ACTION: 'health',
          CAREER_OS_ADMIN_PARAMS_JSON: '',
        },
        encoding: 'utf8',
        timeout: 90_000,
        maxBuffer: 1024 * 1024,
      }
    );

    const parsed = JSON.parse(raw);
    const outer = parsed?.result ?? {};
    const health = outer?.result ?? outer;
    lastSha = String(health?.build?.gitSha || '').trim();

    if (lastSha === targetSha) {
      console.log(
        JSON.stringify({
          stagingRuntimeReady: true,
          gitSha: lastSha,
          attempts: attempt,
        })
      );
      process.exit(0);
    }

    console.log(
      JSON.stringify({
        stagingRuntimeReady: false,
        observedGitSha: lastSha || 'unknown',
        expectedGitSha: targetSha,
        attempt,
      })
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        stagingRuntimeReady: false,
        observedGitSha: lastSha || 'unknown',
        expectedGitSha: targetSha,
        attempt,
        transientAdminError: true,
      })
    );
  }

  await delay(10_000);
}

throw new Error(
  'Staging runtime did not converge to expected Git SHA before timeout. ' +
  'expected=' + targetSha +
  ' observed=' + (lastSha || 'unknown')
);
