import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

import * as compiler from '../packages/knowledge/src/compiler.mjs';
import * as quality from '../packages/knowledge/src/quality.mjs';
import * as verification from '../packages/knowledge/src/selective-verification.mjs';

const bridge = { ...compiler, ...quality, ...verification };
const root = 'apps/apps-script-runtime/src/modules/';
const source = [
  '94_knowledge_provider_adapter.gs',
  '98_knowledge_compiler_staging.gs',
]
  .map((path) => readFileSync(root + path, 'utf8'))
  .join('\n');

const iterator = (items) => {
  let i = 0;
  return {
    hasNext: () => i < items.length,
    next: () => items[i++],
  };
};

function file(
  id,
  body,
  {
    name = id + '.txt',
    mime = 'text/plain',
    props = {},
    size = body.length,
  } = {}
) {
  return {
    props,
    content: body,
    reads: 0,
    getId: () => id,
    getName: () => name,
    getMimeType: () => mime,
    getSize: () => size,
    getLastUpdated: () => new Date('2026-01-01T00:00:00Z'),
    getBlob() {
      this.reads += 1;
      return { getDataAsString: () => this.content };
    },
    setContent(text) {
      this.content = text;
    },
  };
}

function defaultSynthesis(prompt) {
  const refs = [...prompt.matchAll(/<evidence id="([^"]+)"/g)].map(
    (match) => match[1]
  );
  const uncertain = /ASR unclear|garbled|inaudible/i.test(prompt);
  return {
    title: 'Synthetic Session',
    executive_summary:
      'The selected session evidence is fused into one concept-oriented synthesis.',
    topic_blocks: [
      {
        title: 'Synthetic Concept',
        explanation:
          'The concept is supported across the selected session evidence.',
        definitions: ['Synthetic definition.'],
        formulas: [],
        examples: ['Synthetic example.'],
        lecturer_emphasis: [],
        evidence_refs: refs,
        uncertainties: uncertain
          ? ['One cited transcript segment contains uncertain ASR text.']
          : [],
      },
    ],
    uncertainties: uncertain
      ? [
          {
            text: 'The session contains uncertain ASR text.',
            evidence_refs: refs.slice(0, 1),
          },
        ]
      : [],
    conflicts: [],
    coverage: {
      summary: 'All selected evidence units were considered.',
      included_evidence_refs: refs,
      excluded_evidence_refs: [],
    },
  };
}

function defaultVerification(request) {
  return {
    verdicts: request.topics.map((topic) => ({
      topic_index: topic.topicIndex,
      verdict: 'VERIFIED',
      rationale: 'The topic is directly supported by its cited evidence.',
      checked_evidence_refs: topic.evidenceRefs,
      qualifications: [],
    })),
    warnings: [],
  };
}

function harness(files = [], options = {}) {
  const properties = {
    CAREER_OS_ENVIRONMENT: 'staging',
    CAREER_OS_STAGING_LIVE_PROVIDER_TEST: 'ENABLED',
    CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL: 'approved-semantic',
    CAREER_OS_KNOWLEDGE_VERIFICATION_MODEL: 'approved-semantic',
    CAREER_OS_KNOWLEDGE_VERIFICATION: 'ENABLED',
    CAREER_OS_STAGING_TEST_FOLDER_ID: 'session',
    ...options.properties,
  };

  const calls = [];
  const created = [];
  const workspace = {
    getId: () => 'workspace',
    getFiles: () => iterator(files),
    getFilesByName: (name) =>
      iterator(files.filter((item) => item.getName() === name)),
  };
  const context = { getName: () => 'Synthetic session' };

  const sandbox = vm.createContext({
    CAREER_OS_BUILD_INFO: {
      buildProfile: options.profile || 'staging',
      gitSha: 'synthetic',
    },
    CAREER_OS_CONFIG: {
      FREE_ONLY_MODE: true,
      FREE_TIER_GEMINI_MODELS: ['approved-semantic'],
    },
    CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE: bridge,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => properties[key],
      }),
    },
    careerOsVnextAssertLiveStagingProbe_: () => {
      if (
        properties.CAREER_OS_ENVIRONMENT !== 'staging' ||
        properties.CAREER_OS_STAGING_LIVE_PROVIDER_TEST !== 'ENABLED'
      ) {
        throw new Error('staging gate');
      }
      return { getProperty: (key) => properties[key] };
    },
    assertFreeOnlyConfiguration_: () => {},
    careerOsVnextAuthorizedContextIds_: () => ({ session: true }),
    getOrCreateSessionWorkspaceFolder_: () => workspace,
    stripPortableArtifactHeader_: (text) =>
      text.includes('=== END CAREER OS ARTIFACT METADATA ===')
        ? text.split('=== END CAREER OS ARTIFACT METADATA ===')[1].trim()
        : text.trim(),
    DriveApp: {
      getFolderById: () => context,
      getFileById: (id) => files.find((item) => item.getId() === id),
    },
    Drive: {
      Files: {
        get: (id) => ({
          appProperties:
            files.find((item) => item.getId() === id)?.props || {},
        }),
        create: (meta, blob) => {
          const output = file('out-' + created.length, blob.content, {
            name: meta.name,
            mime: meta.mimeType,
            props: meta.appProperties,
          });
          files.push(output);
          created.push(output);
          return { id: output.getId() };
        },
      },
    },
    Utilities: {
      newBlob: (content) => ({ content }),
    },
    getGeminiApiKey_: () => 'synthetic-secret',
    careerOsProviderTelemetryRecord_: () => {},
    UrlFetchApp: {
      fetch: (_url, opts) => {
        const payload = JSON.parse(opts.payload);
        const systemText =
          payload.systemInstruction?.parts?.[0]?.text || '';
        const phase = /selective verifier/i.test(systemText)
          ? 'verification'
          : 'synthesis';

        calls.push({ phase, payload });

        if (options.failPhase === phase) {
          return {
            getResponseCode: () => 429,
            getContentText: () => '{}',
          };
        }

        const userText = payload.contents[0].parts[0].text;
        let result;
        if (phase === 'verification') {
          const request = JSON.parse(userText);
          result =
            options.verificationResult || defaultVerification(request);
        } else {
          result =
            options.synthesisResult || defaultSynthesis(userText);
        }

        return {
          getResponseCode: () => 200,
          getContentText: () =>
            JSON.stringify({
              candidates: [
                {
                  finishReason: 'STOP',
                  content: {
                    parts: [{ text: JSON.stringify(result) }],
                  },
                },
              ],
            }),
        };
      },
    },
  });

  vm.runInContext(source, sandbox);
  return { sandbox, files, calls, created, workspace, properties };
}

const header = (type, body, session = 'session') =>
  `=== CAREER OS ARTIFACT METADATA ===
artifact_type: ${type}
session_folder_drive_id: ${session}
source_version_key: ["source","md5:synthetic"]
processor_name: extract
processor_version: 1
processing_profile_version: 2
=== END CAREER OS ARTIFACT METADATA ===
${body}`;

test('manual staging compiler produces rich synthesis, quality state and selective verification', () => {
  const h = harness([
    file(
      'audio',
      header(
        'audio_transcript',
        '[00:00:01] Synthetic speech. [ASR unclear] one phrase is garbled.'
      ),
      { props: { careerOsGenerated: 'true' } }
    ),
    file('pdf', header('pdf_text_extraction', 'Synthetic PDF text.'), {
      props: { careerOsGenerated: 'true' },
    }),
    file('notes', 'User notes.'),
  ]);

  const first = h.sandbox.runKnowledgeCompilerStaging();
  assert.equal(first.ok, true);
  assert.deepEqual(
    h.calls.map((call) => call.phase),
    ['synthesis', 'verification']
  );
  assert.equal(h.created.length, 2);

  const json = JSON.parse(
    h.created.find((item) => item.getName() === 'SESSION_SYNTHESIS.json')
      .content
  );
  const markdown = h.created.find(
    (item) => item.getName() === 'SESSION_SYNTHESIS.md'
  ).content;

  assert.equal(json.publicationStatus, 'COMPLETE');
  assert.equal(json.qualityStatus, 'PASS');
  assert.equal(json.verificationStatus, 'VERIFIED');
  assert.equal(json.verificationRuntimeStatus, 'COMPLETE');
  assert.equal(json.automaticallyPromotable, false);
  assert.equal(json.evidence[0].content, undefined);
  assert.equal(json.synthesis.topicBlocks.length, 1);
  assert.match(markdown, /## Executive Summary/);
  assert.match(markdown, /Verification: VERIFIED/);
  assert.match(markdown, /## Verification/);

  h.sandbox.runKnowledgeCompilerStaging();
  assert.equal(h.created.length, 2);
  assert.deepEqual(
    h.calls.map((call) => call.phase),
    ['synthesis', 'verification', 'synthesis', 'verification']
  );
});

test('verification provider failure preserves a completed synthesis but forces review', () => {
  const h = harness([file('notes', 'Included evidence.')], {
    failPhase: 'verification',
  });

  const result = h.sandbox.runKnowledgeCompilerForContext('session');
  assert.equal(result.ok, true);
  assert.equal(result.verificationStatus, 'VERIFICATION_FAILED');

  const json = JSON.parse(
    h.created.find((item) => item.getName() === 'SESSION_SYNTHESIS.json')
      .content
  );
  assert.equal(json.publicationStatus, 'COMPLETE');
  assert.equal(json.qualityStatus, 'PASS');
  assert.equal(json.verificationRuntimeStatus, 'FAILED');
  assert.equal(json.verificationReviewRequired, true);
});

test('verification may be explicitly disabled without changing synthesis behavior', () => {
  const h = harness([file('notes', 'Included evidence.')], {
    properties: { CAREER_OS_KNOWLEDGE_VERIFICATION: 'DISABLED' },
  });

  const result = h.sandbox.runKnowledgeCompilerForContext('session');
  assert.equal(result.verificationStatus, 'UNVERIFIED');
  assert.deepEqual(h.calls.map((call) => call.phase), ['synthesis']);
});

test('synthesis provider failure publishes nothing', () => {
  const h = harness([file('notes', 'Included evidence.')], {
    failPhase: 'synthesis',
  });

  assert.throws(() =>
    h.sandbox.runKnowledgeCompilerForContext('session')
  );
  assert.equal(h.created.length, 0);
});

test('unsupported synthesis evidence references publish nothing', () => {
  const h = harness([file('notes', 'Included evidence.')], {
    synthesisResult: {
      title: 'Invalid',
      executive_summary: 'Invalid ref.',
      topic_blocks: [
        {
          title: 'Fake',
          explanation: 'Unsupported statement.',
          evidence_refs: ['missing-ref'],
          definitions: [],
          formulas: [],
          examples: [],
          lecturer_emphasis: [],
          uncertainties: [],
        },
      ],
      uncertainties: [],
      conflicts: [],
      coverage: {
        summary: 'Invalid.',
        included_evidence_refs: ['missing-ref'],
        excluded_evidence_refs: [],
      },
    },
  });

  assert.throws(() =>
    h.sandbox.runKnowledgeCompilerForContext('session')
  );
  assert.equal(h.created.length, 0);
});

test('renamed/generated knowledge outputs never become evidence', () => {
  const outputs = [
    file('renamed', header('session_synthesis', 'Must not feed back'), {
      props: { careerOsKnowledgeCompiler: 'true' },
    }),
    file('course', 'Do not read', {
      name: 'COURSE_KNOWLEDGE.md',
      mime: 'text/markdown',
    }),
    file('named', 'Do not read', {
      name: 'SESSION_SYNTHESIS.md',
      mime: 'text/markdown',
    }),
  ];
  const h = harness([...outputs, file('notes', 'Included')]);

  const bundle = h.sandbox.careerOsKnowledgeCollectEvidence_(
    h.workspace,
    'session'
  );
  assert.equal(bundle.evidence.length, 1);
  assert.equal(bundle.evidence[0].artifactId, 'notes');
  assert.equal(outputs[1].reads, 0);
  assert.equal(outputs[2].reads, 0);
});

test('bounds and source provenance survive runtime packing', () => {
  const large = file('oversize', 'x', { size: 512001 });
  const h = harness([
    large,
    file('wrong', header('audio_transcript', 'Wrong', 'other')),
    ...Array.from({ length: 5 }, (_, i) =>
      file(
        'long' + i,
        header('pdf_text_extraction', 'x'.repeat(20000))
      )
    ),
  ]);

  const b = h.sandbox.careerOsKnowledgeCollectEvidence_(
    h.workspace,
    'session'
  );
  assert.equal(b.coverage.includedChars, 60000);
  assert.equal(b.coverage.completeWithinTextScope, false);
  assert.equal(large.reads, 0);
  assert.ok(
    b.exclusions.some((item) => item.reason === 'context_mismatch')
  );
  assert.ok(b.coverage.truncatedEvidenceIds.length > 0);
  assert.equal(
    b.evidence[0].processingIdentity.processingProfileVersion,
    '2'
  );
  assert.equal(
    b.evidence[0].sourceVersionKey,
    '["source","md5:synthetic"]'
  );
});

test('policy gates fail before evidence reads or provider dispatch', () => {
  const cases = [
    { properties: { CAREER_OS_ENVIRONMENT: 'production' } },
    { profile: 'dashboard' },
    {
      properties: {
        CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL: 'paid-model',
      },
    },
    {
      properties: {
        CAREER_OS_KNOWLEDGE_VERIFICATION_MODEL: 'paid-model',
      },
    },
    {
      properties: {
        CAREER_OS_STAGING_LIVE_PROVIDER_TEST: 'DISABLED',
      },
    },
    {
      properties: {
        CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL: '',
      },
    },
  ];

  for (const options of cases) {
    const input = file('note', 'x');
    const h = harness([input], options);
    assert.throws(() =>
      h.sandbox.runKnowledgeCompilerForContext('session')
    );
    assert.equal(h.calls.length, 0);
    assert.equal(input.reads, 0);
  }

  const h = harness([file('note', 'x')]);
  assert.throws(() =>
    h.sandbox.runKnowledgeCompilerForContext('unauthorized')
  );
});

test('output ownership conflict prevents provider spend', () => {
  const h = harness([
    file('manual', 'User content', {
      name: 'SESSION_SYNTHESIS.md',
      mime: 'text/markdown',
    }),
    file('note', 'x'),
  ]);

  assert.throws(
    () => h.sandbox.runKnowledgeCompilerForContext('session'),
    /ownership/
  );
  assert.equal(h.calls.length, 0);
  assert.equal(h.created.length, 0);
});

test('staging build bundles shared compiler, quality and verification contracts only for staging runtime', () => {
  const profiles = JSON.parse(
    readFileSync('config/apps-script-build-profiles.json', 'utf8')
  ).profiles;
  const build = readFileSync('scripts/build-apps-script.mjs', 'utf8');

  assert.match(build, /CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE/);
  assert.match(build, /packages\/knowledge\/src\/compiler\.mjs/);
  assert.match(build, /packages\/knowledge\/src\/quality\.mjs/);
  assert.match(
    build,
    /packages\/knowledge\/src\/selective-verification\.mjs/
  );

  for (const profile of ['staging', 'production', 'dashboard']) {
    for (const path of [
      '94_knowledge_provider_adapter.gs',
      '98_knowledge_compiler_staging.gs',
    ]) {
      assert.equal(
        profiles[profile].exclude.includes(path),
        profile !== 'staging'
      );
    }
  }
});
