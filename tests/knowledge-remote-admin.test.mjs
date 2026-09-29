import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const admin = readFileSync(
  'apps/apps-script-runtime/src/modules/96_remote_admin.gs',
  'utf8'
);
const compiler = readFileSync(
  'apps/apps-script-runtime/src/modules/98_knowledge_compiler_staging.gs',
  'utf8'
);

test('remote admin allowlists only explicit Knowledge Compiler configuration keys', () => {
  for (const key of [
    'CAREER_OS_KNOWLEDGE_PROVIDER',
    'CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL',
    'CAREER_OS_KNOWLEDGE_VERIFICATION',
    'CAREER_OS_KNOWLEDGE_VERIFICATION_MODEL',
  ]) {
    assert.match(admin, new RegExp("'" + key + "'"));
  }
});

test('remote admin exposes staging-only sanitized knowledge compile and status actions', () => {
  assert.match(admin, /careerOsRemoteAdminAssertStaging_\(\)/);
  assert.match(admin, /action === 'knowledgeCompile'/);
  assert.match(admin, /careerOsRemoteAdminKnowledgeCompile_/);
  assert.match(admin, /action === 'knowledgeStatus'/);
  assert.match(admin, /careerOsRemoteAdminKnowledgeStatus_/);

  const helperStart = admin.indexOf('function careerOsRemoteAdminKnowledgeCompile_');
  const helperEnd = admin.indexOf('function careerOsRemoteAdminKnowledgeStatus_');
  const helper = admin.slice(helperStart, helperEnd);

  assert.doesNotMatch(helper, /contextId|workspaceId|markdownId|jsonId/);
  assert.match(helper, /qualityStatus/);
  assert.match(helper, /verificationStatus/);
  assert.match(helper, /includedArtifacts/);
  assert.match(helper, /includedChars/);
});

test('knowledge status returns metadata only and never emits synthesis bodies', () => {
  const start = admin.indexOf('function careerOsRemoteAdminKnowledgeStatus_');
  const end = admin.indexOf('function careerOsRemoteAdminDispatch_');
  const helper = admin.slice(start, end);

  assert.match(helper, /SESSION_SYNTHESIS\.json/);
  assert.match(helper, /publicationStatus/);
  assert.match(helper, /runtimeGitSha/);
  assert.match(helper, /timings/);
  assert.doesNotMatch(helper, /data\.synthesis/);
  assert.doesNotMatch(helper, /data\.evidence/);
});

test('compiler records synthesis, verification and total timing metadata', () => {
  assert.match(compiler, /synthesisMs/);
  assert.match(compiler, /verificationMs/);
  assert.match(compiler, /totalMs/);
  assert.match(compiler, /totalStartedAt/);
});


test('knowledge compile failures are reduced to public-safe diagnostic codes', () => {
  assert.match(admin, /NO_USABLE_TEXT_EVIDENCE/);
  assert.match(admin, /SYNTHESIS_VALIDATION_FAILED/);
  assert.match(admin, /SYNTHESIS_PROVIDER_FAILED/);
  assert.match(admin, /MODEL_POLICY_BLOCKED/);
  assert.match(admin, /KNOWLEDGE_COMPILER_FAILED/);

  const helperStart = admin.indexOf('function careerOsRemoteAdminKnowledgeCompile_');
  const helperEnd = admin.indexOf('function careerOsRemoteAdminKnowledgeStatus_');
  const helper = admin.slice(helperStart, helperEnd);

  assert.match(helper, /errorCode/);
  assert.match(helper, /providerHttpStatus/);
  assert.doesNotMatch(helper, /error\.message\s*[,}]/);
});

test('admin caller fails CI when sanitized knowledge acceptance returns ok false', () => {
  const caller = readFileSync('scripts/call-apps-script-admin.mjs', 'utf8');
  assert.match(caller, /action === 'knowledgeCompile'/);
  assert.match(caller, /parsed\?\.result\?\.result\?\.ok === false/);
  assert.match(caller, /Knowledge Compiler acceptance failed/);
});
