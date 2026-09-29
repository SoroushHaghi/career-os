// Course knowledge integration. Manual invocation is staging-only; the
// automatic production lane may call the internal entrypoint when explicitly enabled.
const CAREER_OS_COURSE_KNOWLEDGE_LIMITS = {
  maxCourseChildren: 120,
  maxSessionSynthesisBytes: 750000,
  maxPreviousCourseBytes: 2500000,
  maxSemanticRequestChars: 120000
};

function careerOsCourseKnowledgeResolveCourseFolder_(
  sessionId,
  automatic
) {
  let id = String(sessionId || '').trim();

  if (automatic === true) {
    if (
      careerOsRuntimeEnvironment_() !== 'production' ||
      !careerOsKnowledgeAutomationEnabled_()
    ) {
      throw new Error(
        'Automatic course knowledge is not enabled for production.'
      );
    }

    if (!id) {
      throw new Error(
        'Automatic course knowledge requires a session context.'
      );
    }
  } else {
    const props = careerOsVnextAssertLiveStagingProbe_();
    id = id || String(
      props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID') || ''
    ).trim();

    if (!id || !careerOsVnextAuthorizedContextIds_()[id]) {
      throw new Error(
        'Course knowledge requires an authorized staging session.'
      );
    }
  }

  const session = DriveApp.getFolderById(id);

  if (
    automatic === true &&
    !isValidSessionFolder_(session)
  ) {
    throw new Error(
      'Automatic course knowledge requires an eligible production session.'
    );
  }

  const parents = session.getParents();

  if (!parents.hasNext()) {
    throw new Error('Session has no parent course folder.');
  }

  const course = parents.next();
  if (parents.hasNext()) {
    throw new Error('Session has ambiguous parent folders.');
  }

  return {
    courseFolder: course,
    authorizedSessionId: id
  };
}

function careerOsCourseKnowledgeFindWorkspace_(sessionFolder) {
  const folders = sessionFolder.getFoldersByName(
    CAREER_OS_CONFIG.SESSION_WORKSPACE_FOLDER
  );

  if (!folders.hasNext()) return null;

  const workspace = folders.next();
  if (folders.hasNext()) {
    throw new Error('Session has multiple _AI_WORKSPACE folders.');
  }

  return workspace;
}

function careerOsCourseKnowledgeReadSession_(sessionFolder) {
  const workspace = careerOsCourseKnowledgeFindWorkspace_(sessionFolder);
  if (!workspace) return { input: null, reason: 'workspace_missing' };

  const files = workspace.getFilesByName('SESSION_SYNTHESIS.json');
  if (!files.hasNext()) {
    return { input: null, reason: 'session_synthesis_missing' };
  }

  const file = files.next();
  if (files.hasNext()) {
    throw new Error('Session has multiple SESSION_SYNTHESIS.json files.');
  }

  if (
    Number(file.getSize() || 0) >
    CAREER_OS_COURSE_KNOWLEDGE_LIMITS.maxSessionSynthesisBytes
  ) {
    throw new Error('SESSION_SYNTHESIS.json exceeds course integration read bound.');
  }

  const metadata = Drive.Files.get(file.getId(), {
    fields: 'appProperties'
  });
  const appProperties = metadata.appProperties || {};
  const sessionId = sessionFolder.getId();

  if (
    appProperties.careerOsKnowledgeCompiler !== 'true' ||
    appProperties.careerOsSessionFolderId !== sessionId
  ) {
    return { input: null, reason: 'session_synthesis_unowned' };
  }

  const companion = JSON.parse(
    file.getBlob().getDataAsString('UTF-8')
  );

  if (companion.publicationStatus !== 'COMPLETE') {
    return { input: null, reason: 'session_synthesis_partial' };
  }

  if (String(companion.contextId || '') !== sessionId) {
    throw new Error('SESSION_SYNTHESIS context identity mismatch.');
  }

  return {
    input:
      CAREER_OS_COURSE_KNOWLEDGE_BRIDGE
        .sessionSynthesisToCourseInput(companion),
    reason: ''
  };
}

function careerOsCourseKnowledgeDiscoverSessions_(
  courseFolder,
  authorizedSessionId
) {
  const folders = courseFolder.getFolders();
  const sessions = [];
  const exclusions = [];
  let childCount = 0;
  let authorizedSeen = false;

  while (folders.hasNext()) {
    childCount += 1;
    if (
      childCount >
      CAREER_OS_COURSE_KNOWLEDGE_LIMITS.maxCourseChildren
    ) {
      throw new Error('Course child-folder discovery bound exceeded.');
    }

    const child = folders.next();
    if (
      child.getName() ===
      CAREER_OS_CONFIG.SESSION_WORKSPACE_FOLDER
    ) {
      continue;
    }

    const result = careerOsCourseKnowledgeReadSession_(child);
    if (!result.input) {
      exclusions.push({
        sessionFolderIdHash:
          careerOsKnowledgeStableHash_(child.getId()),
        reason: result.reason
      });
      continue;
    }

    sessions.push(result.input);
    if (child.getId() === authorizedSessionId) {
      authorizedSeen = true;
    }
  }

  if (!authorizedSeen) {
    throw new Error(
      'Authorized staging session has no completed owned SESSION_SYNTHESIS.json.'
    );
  }

  sessions.sort(function(left, right) {
    const a = String(left.contextId || left.sessionId || '');
    const b = String(right.contextId || right.sessionId || '');
    return a.localeCompare(b);
  });

  return {
    sessions: sessions,
    exclusions: exclusions,
    childCount: childCount
  };
}

function careerOsCourseKnowledgeOutputTarget_(
  workspace,
  name,
  courseFolderId
) {
  const files = workspace.getFilesByName(name);
  let target = null;

  while (files.hasNext()) {
    const file = files.next();
    const props =
      Drive.Files.get(
        file.getId(),
        { fields: 'appProperties' }
      ).appProperties || {};

    if (
      target ||
      props.careerOsCourseKnowledge !== 'true' ||
      props.careerOsCourseFolderId !== courseFolderId
    ) {
      throw new Error(
        'Course knowledge output name is occupied or ownership is ambiguous.'
      );
    }

    target = file;
  }

  return target;
}

function careerOsCourseKnowledgeReadPrevious_(jsonTarget) {
  if (!jsonTarget) return null;

  if (
    Number(jsonTarget.getSize() || 0) >
    CAREER_OS_COURSE_KNOWLEDGE_LIMITS.maxPreviousCourseBytes
  ) {
    throw new Error('Previous COURSE_KNOWLEDGE.json exceeds read bound.');
  }

  const previous = JSON.parse(
    jsonTarget.getBlob().getDataAsString('UTF-8')
  );

  if (
    !CAREER_OS_COURSE_KNOWLEDGE_BRIDGE
      .isCourseKnowledgeArtifact(previous)
  ) {
    throw new Error('Previous course output is not a course knowledge artifact.');
  }

  return previous;
}

function careerOsCourseKnowledgeWriteOutput_(
  workspace,
  target,
  artifact,
  courseFolderId
) {
  if (target) {
    target.setContent(artifact.content);
    return target;
  }

  const created = Drive.Files.create(
    {
      name: artifact.name,
      mimeType: artifact.mimeType,
      parents: [workspace.getId()],
      appProperties: {
        careerOsGenerated: 'true',
        careerOsCourseKnowledge: 'true',
        careerOsCourseFolderId: courseFolderId,
        careerOsArtifactType: 'course_knowledge'
      }
    },
    Utilities.newBlob(
      artifact.content,
      artifact.mimeType,
      artifact.name
    ),
    { fields: 'id' }
  );

  return DriveApp.getFileById(created.id);
}

function careerOsCourseKnowledgeSemanticReconcile_(
  request,
  config
) {
  if (
    typeof careerOsKnowledgeGenerateJsonWithFallback_ ===
    'function'
  ) {
    return careerOsKnowledgeGenerateJsonWithFallback_(
      'course_reconciliation',
      request.systemInstruction,
      request.userPrompt,
      request.responseSchema,
      config.synthesisModel,
      config.synthesisFallbackModel || null,
      config
    );
  }

  return careerOsKnowledgeGenerateJson_(
    'course_reconciliation',
    request.systemInstruction,
    request.userPrompt,
    request.responseSchema,
    config.synthesisModel,
    config
  );
}

function careerOsRunCourseKnowledge_(sessionId, options) {
  const opts =
    options && typeof options === 'object'
      ? options
      : {};
  const automatic = opts.automatic === true;
  const totalStartedAt = Date.now();

  if (
    typeof CAREER_OS_COURSE_KNOWLEDGE_BRIDGE ===
    'undefined'
  ) {
    throw new Error(
      'Course knowledge bridge is missing from this runtime build.'
    );
  }

  const config = careerOsKnowledgeProviderConfig_({
    automatic: automatic
  });
  const resolved =
    careerOsCourseKnowledgeResolveCourseFolder_(
      sessionId,
      automatic
    );
  const courseFolder = resolved.courseFolder;
  const courseFolderId = courseFolder.getId();

  const courseWorkspace =
    getOrCreateSessionWorkspaceFolder_(
      courseFolder,
      true
    );

  const markdownTarget =
    careerOsCourseKnowledgeOutputTarget_(
      courseWorkspace,
      'COURSE_KNOWLEDGE.md',
      courseFolderId
    );
  const jsonTarget =
    careerOsCourseKnowledgeOutputTarget_(
      courseWorkspace,
      'COURSE_KNOWLEDGE.json',
      courseFolderId
    );

  const discoveryStartedAt = Date.now();
  const discovered =
    careerOsCourseKnowledgeDiscoverSessions_(
      courseFolder,
      resolved.authorizedSessionId
    );
  const discoveryMs =
    Date.now() - discoveryStartedAt;

  const previous =
    careerOsCourseKnowledgeReadPrevious_(jsonTarget);

  const options = {
    course: {
      courseId: 'drive-course:' + courseFolderId,
      title: courseFolder.getName()
    },
    sessions: discovered.sessions,
    previous: previous
  };

  let semanticStatus = 'SKIPPED_SINGLE_SESSION';
  let semanticMs = null;
  let course = null;

  if (
    discovered.sessions.length > 1 ||
    (
      previous &&
      previous.coverage &&
      Number(previous.coverage.sessionVersions || 0) > 1
    )
  ) {
    const semanticStartedAt = Date.now();

    try {
      const request =
        CAREER_OS_COURSE_KNOWLEDGE_BRIDGE
          .buildCourseConsolidationRequest({
            course: options.course,
            sessions: options.sessions,
            previous: options.previous,
            maxChars:
              CAREER_OS_COURSE_KNOWLEDGE_LIMITS
                .maxSemanticRequestChars
          });

      const reconciliation =
        careerOsCourseKnowledgeSemanticReconcile_(
          request,
          config
        );

      try {
        course =
          CAREER_OS_COURSE_KNOWLEDGE_BRIDGE
            .consolidateCourseKnowledge({
              course: options.course,
              sessions: options.sessions,
              previous: options.previous,
              maxChars:
                CAREER_OS_COURSE_KNOWLEDGE_LIMITS
                  .maxSemanticRequestChars,
              reconciliation: reconciliation
            });

        semanticStatus = 'COMPLETE';
      } catch (_invalidResponse) {
        semanticStatus = 'REJECTED_RESPONSE';
      }
    } catch (_providerOrBoundError) {
      semanticStatus = 'FAILED_OR_BOUNDED';
    }

    semanticMs = Date.now() - semanticStartedAt;
  }

  if (!course) {
    course =
      CAREER_OS_COURSE_KNOWLEDGE_BRIDGE
        .consolidateCourseKnowledge(options);
  }

  const artifacts =
    CAREER_OS_COURSE_KNOWLEDGE_BRIDGE
      .createCourseKnowledgeArtifacts(course);

  const markdown = artifacts.find(function(item) {
    return item.name === 'COURSE_KNOWLEDGE.md';
  });
  const json = artifacts.find(function(item) {
    return item.name === 'COURSE_KNOWLEDGE.json';
  });

  if (!markdown || !json) {
    throw new Error('Course knowledge renderer did not return both artifacts.');
  }

  // Write human projection first and machine snapshot last.
  // A consumer that keys off JSON therefore never sees a new snapshot before its MD peer.
  careerOsCourseKnowledgeWriteOutput_(
    courseWorkspace,
    markdownTarget,
    markdown,
    courseFolderId
  );
  careerOsCourseKnowledgeWriteOutput_(
    courseWorkspace,
    jsonTarget,
    json,
    courseFolderId
  );

  return {
    ok: true,
    sessionVersions:
      Number(course.coverage.sessionVersions || 0),
    sessions:
      Number(course.coverage.sessions || 0),
    concepts:
      Number(course.coverage.consolidatedConcepts || 0),
    semanticStatus: semanticStatus,
    semanticModel:
      config.runtimeModels &&
      config.runtimeModels.course_reconciliation
        ? config.runtimeModels.course_reconciliation
        : (
            semanticStatus === 'COMPLETE'
              ? config.synthesisModel
              : null
          ),
    verificationStatus:
      String(course.verificationStatus || 'UNVERIFIED'),
    automaticallyPromotable:
      Boolean(course.automaticallyPromotable),
    exclusions: discovered.exclusions.length,
    timings: {
      discoveryMs: discoveryMs,
      semanticMs: semanticMs,
      totalMs: Date.now() - totalStartedAt
    }
  };
}

function runCourseKnowledgeForStagingCourse() {
  const props = careerOsVnextAssertLiveStagingProbe_();
  return careerOsRunCourseKnowledge_(
    props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID'),
    { automatic: false }
  );
}

function careerOsRunCourseKnowledgeAutomatic_(sessionId) {
  return careerOsRunCourseKnowledge_(
    sessionId,
    { automatic: true }
  );
}

function careerOsCourseKnowledgeStatus_() {
  const resolved =
    careerOsCourseKnowledgeResolveCourseFolder_(
      '',
      false
    );
  const courseFolder = resolved.courseFolder;
  const workspace =
    careerOsCourseKnowledgeFindWorkspace_(courseFolder);

  if (!workspace) {
    return { present: false };
  }

  const files =
    workspace.getFilesByName(
      'COURSE_KNOWLEDGE.json'
    );

  if (!files.hasNext()) {
    return { present: false };
  }

  const file = files.next();
  if (files.hasNext()) {
    throw new Error(
      'Course has multiple COURSE_KNOWLEDGE.json files.'
    );
  }

  const props =
    Drive.Files.get(
      file.getId(),
      { fields: 'appProperties' }
    ).appProperties || {};

  if (
    props.careerOsCourseKnowledge !== 'true' ||
    props.careerOsCourseFolderId !==
      courseFolder.getId()
  ) {
    return {
      present: false,
      ownership: 'unverified'
    };
  }

  if (
    Number(file.getSize() || 0) >
    CAREER_OS_COURSE_KNOWLEDGE_LIMITS
      .maxPreviousCourseBytes
  ) {
    throw new Error(
      'COURSE_KNOWLEDGE.json exceeds status read bound.'
    );
  }

  const data = JSON.parse(
    file.getBlob().getDataAsString('UTF-8')
  );

  return {
    present: true,
    verificationStatus:
      String(data.verificationStatus || ''),
    automaticallyPromotable:
      Boolean(data.automaticallyPromotable),
    consolidationVersion:
      String(data.consolidationVersion || ''),
    coverage: {
      sessions:
        Number(
          data.coverage &&
          data.coverage.sessions ||
          0
        ),
      sessionVersions:
        Number(
          data.coverage &&
          data.coverage.sessionVersions ||
          0
        ),
      consolidatedConcepts:
        Number(
          data.coverage &&
          data.coverage.consolidatedConcepts ||
          0
        ),
      semanticReconciliation:
        Boolean(
          data.coverage &&
          data.coverage.semanticReconciliation
        )
    }
  };
}
