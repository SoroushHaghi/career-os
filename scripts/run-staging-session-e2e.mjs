// Bounded end-to-end staging acceptance for one authorized session.
// Keeps private filenames/source IDs inside the remote-admin response buffers and
// emits only aggregate timing/status metadata.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';

const execFileAsync = promisify(execFile);
const deadline =
  Date.now() +
  Number(process.env.CAREER_OS_E2E_DEADLINE_MS || 24 * 60_000);

async function call(action, params = '') {
  const { stdout } = await execFileAsync(
    process.execPath,
    ['scripts/call-apps-script-admin.mjs'],
    {
      env: {
        ...process.env,
        CAREER_OS_ADMIN_ACTION: action,
        CAREER_OS_ADMIN_PARAMS_JSON:
          params && typeof params === 'string'
            ? params
            : JSON.stringify(params || {}),
      },
      encoding: 'utf8',
      timeout: 390_000,
      maxBuffer: 2 * 1024 * 1024,
    }
  );

  const parsed = JSON.parse(stdout);
  const outer = parsed?.result ?? {};
  return outer?.result ?? outer;
}

function queueSnapshot(health) {
  const queues = health?.queues ?? {};
  const audio = Array.isArray(queues.audio) ? queues.audio : [];
  return {
    image: Number(queues.imageCount || 0),
    audio: audio.length,
    audioDueAt:
      audio.length > 0
        ? Math.min(
            ...audio.map((job) => Number(job?.nextAttemptAt || 0))
          )
        : 0,
  };
}

const startedAt = Date.now();

// Re-run routing idempotently. Existing current artifacts should be reused;
// changed/new media should become queue work.
await call('folderIngest');

let health = await call('health');
let state = queueSnapshot(health);
let cycles = 0;
let idleCycles = 0;
let previous = JSON.stringify(state);

while (
  (state.image > 0 || state.audio > 0) &&
  Date.now() < deadline
) {
  cycles += 1;

  const actions = [];
  if (state.image > 0) actions.push(call('imageWorkerOnce'));
  if (state.audio > 0) {
    if (!state.audioDueAt || state.audioDueAt <= Date.now()) {
      actions.push(call('audioWorkerOnce'));
    }
  }

  if (!actions.length) {
    const waitMs = Math.min(
      30_000,
      Math.max(1_000, state.audioDueAt - Date.now())
    );
    await delay(waitMs);
  } else {
    await Promise.allSettled(actions);
  }

  health = await call('health');
  state = queueSnapshot(health);

  const current = JSON.stringify(state);
  if (current === previous) {
    idleCycles += 1;
  } else {
    idleCycles = 0;
  }
  previous = current;

  // A provider retry can legitimately leave a queue stable while nextAttemptAt
  // is in the future. Do not busy-loop, but also do not abandon resumable work.
  if (idleCycles >= 3) {
    const dueAt = Number(state.audioDueAt || 0);
    if (dueAt > Date.now() && dueAt < deadline) {
      await delay(Math.min(30_000, dueAt - Date.now()));
      idleCycles = 0;
    } else if (state.image > 0 || state.audio > 0) {
      throw new Error(
        'End-to-end staging queues made no progress for three bounded cycles.'
      );
    }
  }
}

if (state.image > 0 || state.audio > 0) {
  throw new Error(
    'End-to-end staging media drain exceeded bounded acceptance window.'
  );
}

const mediaReadyAt = Date.now();

const session = await call('knowledgeCompile');
if (session?.ok !== true) {
  throw new Error(
    'Session Knowledge Compiler failed: ' +
    String(session?.errorCode || 'UNKNOWN')
  );
}

const sessionStatus = await call('knowledgeStatus');
if (sessionStatus?.present !== true) {
  throw new Error('SESSION_SYNTHESIS.json is not present after successful compile.');
}

const course = await call('courseKnowledgeCompile');
if (course?.ok !== true) {
  throw new Error('Course knowledge compilation did not complete.');
}

const courseStatus = await call('courseKnowledgeStatus');
if (courseStatus?.present !== true) {
  throw new Error('COURSE_KNOWLEDGE.json is not present after successful compile.');
}

const finishedAt = Date.now();

console.log(
  JSON.stringify({
    ok: true,
    media: {
      cycles,
      imageQueueRemaining: state.image,
      audioQueueRemaining: state.audio,
      elapsedMs: mediaReadyAt - startedAt,
    },
    session: {
      qualityStatus: String(session.qualityStatus || ''),
      verificationStatus: String(session.verificationStatus || ''),
      synthesisModel: String(session.synthesisModel || ''),
      verificationModel: String(session.verificationModel || ''),
      timings: session.timings || {},
      includedArtifacts: Number(
        session.coverage?.includedArtifacts || 0
      ),
      includedChars: Number(session.coverage?.includedChars || 0),
    },
    course: {
      sessions: Number(course.sessions || 0),
      sessionVersions: Number(course.sessionVersions || 0),
      concepts: Number(course.concepts || 0),
      semanticStatus: String(course.semanticStatus || ''),
      semanticModel: String(course.semanticModel || ''),
      verificationStatus: String(course.verificationStatus || ''),
      timings: course.timings || {},
    },
    totalMs: finishedAt - startedAt,
  })
);
