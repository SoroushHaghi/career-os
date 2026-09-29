import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

import * as crossSession from '../packages/knowledge/src/cross-session.mjs';
import * as courseRenderer from '../packages/knowledge/src/course-renderer.mjs';

const bridge = { ...crossSession, ...courseRenderer };
const runtimeSource = readFileSync(
  'apps/apps-script-runtime/src/modules/99_course_knowledge_staging.gs',
  'utf8'
);
const adminSource = readFileSync(
  'apps/apps-script-runtime/src/modules/96_remote_admin.gs',
  'utf8'
);
const buildSource = readFileSync('scripts/build-apps-script.mjs', 'utf8');
const profiles = JSON.parse(
  readFileSync('config/apps-script-build-profiles.json', 'utf8')
).profiles;

const iterator = (items) => {
  let index = 0;
  return {
    hasNext: () => index < items.length,
    next: () => items[index++],
  };
};

function makeFile(id, name, content, props = {}) {
  return {
    id,
    name,
    content,
    props,
    getId: () => id,
    getName: () => name,
    getSize() {
      return Buffer.byteLength(this.content, 'utf8');
    },
    getBlob() {
      return {
        getDataAsString: () => this.content,
      };
    },
    setContent(value) {
      this.content = value;
    },
  };
}

function makeWorkspace(id) {
  const files = [];
  return {
    id,
    files,
    getId: () => id,
    getName: () => '_AI_WORKSPACE',
    getFilesByName(name) {
      return iterator(files.filter((item) => item.getName() === name));
    },
  };
}

function makeFolder(id, name) {
  return {
    id,
    name,
    parent: null,
    children: [],
    workspaces: [],
    getId: () => id,
    getName: () => name,
    getParents() {
      return iterator(this.parent ? [this.parent] : []);
    },
    getFolders() {
      return iterator(this.children);
    },
    getFoldersByName(name) {
      return iterator(
        this.workspaces.filter((item) => item.getName() === name)
      );
    },
    createFolder() {
      const workspace = makeWorkspace(id + ':workspace');
      this.workspaces.push(workspace);
      return workspace;
    },
  };
}

function sessionCompanion(sessionId, conceptTitle = 'Shared concept') {
  return {
    schemaVersion: '0.2',
    artifactType: 'session_synthesis',
    generatedBy: 'synthetic',
    contextId: sessionId,
    generatedAt: '2026-01-01T00:00:00.000Z',
    runtimeGitSha: 'synthetic',
    provider: 'gemini',
    models: { synthesis: 'synthetic-model', verification: null },
    bundleId: 'bundle:' + sessionId,
    qualityStatus: 'PASS',
    quality: { pass: true, score: 1, failures: [] },
    verificationRuntimeStatus: 'DISABLED',
    verificationStatus: 'UNVERIFIED',
    verificationReviewRequired: true,
    verification: { verdicts: [], warnings: [] },
    verificationErrors: [],
    automaticallyPromotable: false,
    publicationStatus: 'COMPLETE',
    coverage: { selectedChars: 100, completeWithinTextScope: true },
    exclusions: [],
    evidence: [
      {
        evidenceId: 'e:' + sessionId,
        artifactId: 'a:' + sessionId,
        sourceVersionKey: 'source:' + sessionId,
        modality: 'text',
        anchor: { start: 0, end: 100 },
      },
    ],
    synthesis: {
      title: 'Session ' + sessionId,
      executiveSummary: 'Synthetic summary.',
      topicBlocks: [
        {
          title: conceptTitle,
          explanation: 'Explanation from ' + sessionId + '.',
          definitions: [],
          formulas: [],
          examples: [],
          lecturerEmphasis: [],
          evidenceRefs: ['e:' + sessionId],
          uncertainties: [],
        },
      ],
      uncertainties: [],
      conflicts: [],
      coverage: {
        summary: 'Synthetic.',
        includedEvidenceRefs: ['e:' + sessionId],
        excludedEvidenceRefs: [],
      },
    },
  };
}

function harness({ sessionCount = 1 } = {}) {
  const course = makeFolder('course', 'Synthetic Course');
  const sessions = Array.from({ length: sessionCount }, (_, index) =>
    makeFolder('session-' + (index + 1), 'Session ' + (index + 1))
  );

  sessions.forEach((session) => {
    session.parent = course;
    course.children.push(session);

    const workspace = makeWorkspace(session.id + ':workspace');
    session.workspaces.push(workspace);

    const companion = sessionCompanion(session.id);
    workspace.files.push(
      makeFile(
        'synthesis:' + session.id,
        'SESSION_SYNTHESIS.json',
        JSON.stringify(companion),
        {
          careerOsKnowledgeCompiler: 'true',
          careerOsSessionFolderId: session.id,
        }
      )
    );
  });

  const byId = new Map([
    [course.id, course],
    ...sessions.map((session) => [session.id, session]),
  ]);
  const allFiles = new Map();
  for (const folder of [course, ...sessions]) {
    for (const workspace of folder.workspaces) {
      for (const item of workspace.files) allFiles.set(item.id, item);
    }
  }

  const sandbox = vm.createContext({
    CAREER_OS_COURSE_KNOWLEDGE_BRIDGE: bridge,
    CAREER_OS_CONFIG: {
      SESSION_WORKSPACE_FOLDER: '_AI_WORKSPACE',
    },
    careerOsVnextAssertLiveStagingProbe_: () => ({
      getProperty: (key) =>
        key === 'CAREER_OS_STAGING_TEST_FOLDER_ID'
          ? sessions[0].id
          : '',
    }),
    careerOsVnextAuthorizedContextIds_: () => ({
      [sessions[0].id]: true,
    }),
    careerOsKnowledgeProviderConfig_: () => ({
      synthesisModel: 'synthetic-model',
      synthesisFallbackModel: null,
      runtimeModels: {},
    }),
    careerOsKnowledgeStableHash_: (value) =>
      String(value).length.toString(16).padStart(8, '0'),
    careerOsKnowledgeGenerateJson_: () => {
      throw new Error('provider should not run for one session');
    },
    getOrCreateSessionWorkspaceFolder_: (folder, create) => {
      if (folder.workspaces.length) return folder.workspaces[0];
      return create ? folder.createFolder('_AI_WORKSPACE') : null;
    },
    DriveApp: {
      getFolderById: (id) => byId.get(id),
      getFileById: (id) => allFiles.get(id),
    },
    Drive: {
      Files: {
        get: (id) => ({
          appProperties: allFiles.get(id)?.props || {},
        }),
        create: (meta, blob) => {
          const item = makeFile(
            'created:' + meta.name,
            meta.name,
            blob.content,
            meta.appProperties
          );
          allFiles.set(item.id, item);
          const workspace = course.workspaces[0];
          workspace.files.push(item);
          return { id: item.id };
        },
      },
    },
    Utilities: {
      newBlob: (content) => ({ content }),
    },
  });

  vm.runInContext(runtimeSource, sandbox);
  return { sandbox, course, sessions, allFiles };
}

test('single completed session creates deterministic course artifacts without provider spend', () => {
  const h = harness({ sessionCount: 1 });
  const result = h.sandbox.runCourseKnowledgeForStagingCourse();

  assert.equal(result.ok, true);
  assert.equal(result.sessions, 1);
  assert.equal(result.sessionVersions, 1);
  assert.equal(result.semanticStatus, 'SKIPPED_SINGLE_SESSION');
  assert.equal(result.automaticallyPromotable, false);

  const workspace = h.course.workspaces[0];
  const md = workspace.files.find(
    (item) => item.getName() === 'COURSE_KNOWLEDGE.md'
  );
  const json = workspace.files.find(
    (item) => item.getName() === 'COURSE_KNOWLEDGE.json'
  );

  assert.ok(md);
  assert.ok(json);
  assert.equal(md.props.careerOsCourseKnowledge, 'true');

  const parsed = JSON.parse(json.content);
  assert.equal(parsed.artifactType, 'course_knowledge');
  assert.equal(parsed.coverage.sessions, 1);
  assert.equal(parsed.automaticallyPromotable, false);
});

test('runtime only accepts owned complete session synthesis artifacts', () => {
  const h = harness({ sessionCount: 1 });
  const workspace = h.sessions[0].workspaces[0];
  workspace.files[0].props = {};

  assert.throws(
    () => h.sandbox.runCourseKnowledgeForStagingCourse(),
    /no completed owned SESSION_SYNTHESIS/
  );
});

test('course outputs are update-owned and do not duplicate on rerun', () => {
  const h = harness({ sessionCount: 1 });
  h.sandbox.runCourseKnowledgeForStagingCourse();
  const firstCount = h.course.workspaces[0].files.length;

  h.sandbox.runCourseKnowledgeForStagingCourse();
  assert.equal(h.course.workspaces[0].files.length, firstCount);
});

test('Apps Script build includes course bridge only in staging surface', () => {
  assert.match(buildSource, /CAREER_OS_COURSE_KNOWLEDGE_BRIDGE/);
  assert.match(buildSource, /packages\/knowledge\/src\/cross-session\.mjs/);
  assert.match(buildSource, /packages\/knowledge\/src\/course-renderer\.mjs/);

  for (const profile of ['production', 'dashboard']) {
    assert.ok(
      profiles[profile].exclude.includes('99_course_knowledge_staging.gs')
    );
  }
  assert.ok(
    !profiles.staging.exclude.includes('99_course_knowledge_staging.gs')
  );
});

test('remote admin exposes only sanitized course compile/status actions', () => {
  assert.match(adminSource, /action === 'courseKnowledgeCompile'/);
  assert.match(adminSource, /action === 'courseKnowledgeStatus'/);
  assert.match(adminSource, /careerOsRemoteAdminAssertStaging_/);
  assert.doesNotMatch(
    adminSource.slice(
      adminSource.indexOf('function careerOsRemoteAdminCourseKnowledgeCompile_'),
      adminSource.indexOf('function careerOsRemoteAdminDispatch_')
    ),
    /courseFolderId|sessionFolderId|markdownId|jsonId/
  );
});
