import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as bridge from '../packages/knowledge/src/enrichment.mjs';

const root = 'apps/apps-script-runtime/src/modules/';
const source = ['94_knowledge_provider_adapter.gs', '98_knowledge_compiler_staging.gs']
  .map(path => readFileSync(root + path, 'utf8')).join('\n');
const iterator = items => { let i = 0; return { hasNext: () => i < items.length, next: () => items[i++] }; };
function file(id, body, { name = id + '.txt', mime = 'text/plain', props = {}, size = body.length } = {}) {
  return { props, reads: 0, getId: () => id, getName: () => name, getMimeType: () => mime,
    getSize: () => size, getLastUpdated: () => new Date('2026-01-01'),
    getBlob() { this.reads++; return { getDataAsString: () => body }; },
    setContent(text) { this.content = text; } };
}
function harness(files = [], options = {}) {
  const properties = { CAREER_OS_ENVIRONMENT: 'staging', CAREER_OS_STAGING_LIVE_PROVIDER_TEST: 'ENABLED',
    CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL: 'approved-semantic', CAREER_OS_STAGING_TEST_FOLDER_ID: 'session',
    ...options.properties };
  const calls = [], created = [];
  const workspace = { getId: () => 'workspace', getFiles: () => iterator(files),
    getFilesByName: name => iterator(files.filter(f => f.getName() === name)) };
  const context = { getName: () => 'Synthetic session' };
  const sandbox = vm.createContext({
    CAREER_OS_BUILD_INFO: { buildProfile: options.profile || 'staging', gitSha: 'synthetic' },
    CAREER_OS_CONFIG: { FREE_ONLY_MODE: true, FREE_TIER_GEMINI_MODELS: ['approved-semantic'] },
    CAREER_OS_KNOWLEDGE_BRIDGE: bridge,
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties[key] }) },
    careerOsVnextAssertLiveStagingProbe_: () => {
      if (properties.CAREER_OS_ENVIRONMENT !== 'staging' || properties.CAREER_OS_STAGING_LIVE_PROVIDER_TEST !== 'ENABLED') {
        throw new Error('staging gate');
      }
      return { getProperty: key => properties[key] };
    },
    assertFreeOnlyConfiguration_: () => {},
    careerOsVnextAuthorizedContextIds_: () => ({ session: true }),
    getOrCreateSessionWorkspaceFolder_: () => workspace,
    stripPortableArtifactHeader_: text => text.includes('=== END CAREER OS ARTIFACT METADATA ===')
      ? text.split('=== END CAREER OS ARTIFACT METADATA ===')[1].trim() : text.trim(),
    DriveApp: { getFolderById: () => context, getFileById: id => files.find(f => f.getId() === id) },
    Drive: { Files: { get: id => ({ appProperties: files.find(f => f.getId() === id).props }),
      create: (meta, blob) => {
        const output = file('out-' + created.length, blob.content, { name: meta.name, mime: meta.mimeType, props: meta.appProperties });
        output.content = blob.content; files.push(output); created.push(output); return { id: output.getId() };
      } } },
    Utilities: { newBlob: content => ({ content }) },
    getGeminiApiKey_: () => 'synthetic-secret', careerOsProviderTelemetryRecord_: () => {},
    UrlFetchApp: { fetch: (url, opts) => {
      calls.push({ url, opts });
      const input = JSON.parse(JSON.parse(opts.payload).contents[0].parts[0].text);
      const result = options.result || { topics: [{ title: 'Concept', explanation: 'Semantic result.',
        evidenceIds: input.evidenceIds }], relations: [], conflicts: [], warnings: [] };
      return { getResponseCode: () => options.httpStatus || 200, getContentText: () => JSON.stringify({
        candidates: [{ finishReason: options.finishReason || 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }]
      }) };
    } }
  });
  vm.runInContext(source, sandbox);
  return { sandbox, files, calls, created, workspace };
}
const header = (type, body, session = 'session') =>
  `=== CAREER OS ARTIFACT METADATA ===\nartifact_type: ${type}\nsession_folder_drive_id: ${session}\n` +
  'source_version_key: ["source","md5:synthetic"]\nprocessor_name: extract\nprocessor_version: 1\n' +
  'processing_profile_version: 2\n=== END CAREER OS ARTIFACT METADATA ===\n' + body;

test('manual staging path sends one semantic request and writes reusable owned outputs', () => {
  const h = harness([file('audio', header('audio_transcript', '[00:00:01] Synthetic speech'), { props: { careerOsGenerated: 'true' } }),
    file('pdf', header('pdf_text_extraction', 'Synthetic PDF text'), { props: { careerOsGenerated: 'true' } }),
    file('ocr', header('image_ocr', 'Synthetic OCR')), file('notes', 'User notes')]);
  const first = h.sandbox.runKnowledgeCompilerStaging();
  assert.equal(first.ok, true); assert.equal(first.coverage.includedArtifacts, 4);
  assert.equal(h.calls.length, 1); assert.equal(h.created.length, 2);
  const json = JSON.parse(h.created[0].content);
  assert.equal(json.publicationStatus, 'COMPLETE'); assert.equal(json.verificationStatus, 'UNVERIFIED');
  assert.equal(json.automaticallyPromotable, false); assert.equal(json.evidence[0].content, undefined);
  assert.match(h.created[1].content, /Evidence: artifact:/);
  h.sandbox.runKnowledgeCompilerStaging();
  assert.equal(h.created.length, 2); assert.equal(h.calls.length, 2);
  const sent = JSON.parse(JSON.parse(h.calls[1].opts.payload).contents[0].parts[0].text);
  assert.equal(sent.evidence.length, 4); assert.match(h.calls[0].url, /approved-semantic:generateContent$/);
});

test('renamed generated synthesis and unrelated generated files never become evidence', () => {
  const outputs = [file('renamed', header('session_synthesis', 'Must not feed back')),
    file('ledger', 'Operational metadata', { props: { careerOsGenerated: 'true' } }),
    file('named', 'Do not read', { name: 'SESSION_SYNTHESIS.md', mime: 'text/markdown' })];
  const h = harness([...outputs, file('notes', 'Included')]);
  const bundle = h.sandbox.careerOsKnowledgeCollectEvidence_(h.workspace, 'session');
  assert.equal(bundle.evidence.length, 1); assert.equal(bundle.evidence[0].artifactId, 'notes');
  assert.equal(outputs[2].reads, 0);
});

test('bounds and source provenance survive packing; cross-context text excluded', () => {
  const large = file('oversize', 'x', { size: 512001 });
  const h = harness([large, file('wrong', header('audio_transcript', 'Wrong', 'other')),
    ...Array.from({ length: 5 }, (_, i) => file('long' + i, header('pdf_text_extraction', 'x'.repeat(20000))))]);
  const b = h.sandbox.careerOsKnowledgeCollectEvidence_(h.workspace, 'session');
  assert.equal(b.coverage.includedChars, 60000); assert.equal(b.coverage.completeWithinTextScope, false);
  assert.equal(large.reads, 0); assert.ok(b.exclusions.some(x => x.reason === 'context_mismatch'));
  assert.equal(b.evidence[0].processingIdentity.processingProfileVersion, '2');
  assert.equal(b.evidence[0].sourceVersionKey, '["source","md5:synthetic"]');
  assert.equal(b.evidence[0].anchor.end, 16000);
});

test('empty and oversized discovery fail without provider calls', () => {
  for (const files of [[], Array.from({ length: 201 }, (_, i) => file('f' + i, 'x'))]) {
    const h = harness(files); assert.throws(() => h.sandbox.runKnowledgeCompilerForContext('session'));
    assert.equal(h.calls.length, 0);
  }
});

test('all policy gates fail before reading or dispatching', () => {
  for (const options of [{ properties: { CAREER_OS_ENVIRONMENT: 'production' } },
    { profile: 'dashboard' }, { properties: { CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL: 'paid-model' } },
    { properties: { CAREER_OS_STAGING_LIVE_PROVIDER_TEST: 'DISABLED' } },
    { properties: { CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL: '' } }]) {
    const input = file('note', 'x'), h = harness([input], options);
    assert.throws(() => h.sandbox.runKnowledgeCompilerForContext('session'));
    assert.equal(h.calls.length, 0); assert.equal(input.reads, 0);
  }
  const h = harness([file('note', 'x')]);
  assert.throws(() => h.sandbox.runKnowledgeCompilerForContext('unauthorized'));
});

test('output ownership conflict prevents spending a provider call', () => {
  const h = harness([file('manual', 'User content', { name: 'SESSION_SYNTHESIS.md' }), file('note', 'x')]);
  assert.throws(() => h.sandbox.runKnowledgeCompilerForContext('session'), /ownership/);
  assert.equal(h.calls.length, 0); assert.equal(h.created.length, 0);
});

test('provider errors, truncation and unsupported refs publish nothing', () => {
  for (const options of [{ httpStatus: 429 }, { finishReason: 'MAX_TOKENS' }, { result: { topics: [], relations: [], conflicts: [], warnings: [] } },
    { result: { topics: [{ title: 'Fake', explanation: 'Unsupported', evidenceIds: ['missing'] }], relations: [], conflicts: [], warnings: [] } }]) {
    const h = harness([file('note', 'x')], options);
    assert.throws(() => h.sandbox.runKnowledgeCompilerForContext('session')); assert.equal(h.created.length, 0);
  }
});

test('build includes existing knowledge API only on staging and no compiler on other profiles', () => {
  const profiles = JSON.parse(readFileSync('config/apps-script-build-profiles.json', 'utf8')).profiles;
  const build = readFileSync('scripts/build-apps-script.mjs', 'utf8');
  assert.match(build, /knowledgeBridge = buildProfile === 'staging'/);
  assert.match(build, /packages\/knowledge\/src\/enrichment\.mjs/);
  for (const profile of ['staging', 'production', 'dashboard']) {
    for (const path of ['94_knowledge_provider_adapter.gs', '98_knowledge_compiler_staging.gs']) {
      assert.equal(profiles[profile].exclude.includes(path), profile !== 'staging');
    }
  }
});
