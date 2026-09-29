// Manual staging integration only. No scanner, queue, trigger or promotion registration.
const CAREER_OS_KNOWLEDGE_RUNTIME_LIMITS = {
  maxWorkspaceFiles: 200,
  maxEvidenceFiles: 40,
  maxFileBytes: 512000,
  maxReadBytes: 4000000,
  maxArtifactChars: 16000,
  maxTotalChars: 60000
};

// contextId is the session Drive folder ID (not the _AI_WORKSPACE folder ID).
function runKnowledgeCompilerForContext(contextId) {
  const totalStartedAt = Date.now();
  const config = careerOsKnowledgeProviderConfig_();
  const id = String(contextId || '').trim();
  if (!id || !careerOsVnextAuthorizedContextIds_()[id]) {
    throw new Error('Knowledge context must be explicitly staging-authorized.');
  }

  if (typeof CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE === 'undefined') {
    throw new Error('Knowledge compiler bridge is missing from this staging build.');
  }

  const context = DriveApp.getFolderById(id);
  const workspace = getOrCreateSessionWorkspaceFolder_(context, false);
  if (!workspace) throw new Error('Context has no existing _AI_WORKSPACE.');

  // Fail before provider spend if a user-owned output name is occupied.
  const markdown = careerOsKnowledgeOutputTarget_(workspace, 'SESSION_SYNTHESIS.md', id);
  const json = careerOsKnowledgeOutputTarget_(workspace, 'SESSION_SYNTHESIS.json', id);

  const collected = careerOsKnowledgeCollectEvidence_(workspace, id);
  if (!collected.evidence.length) {
    throw new Error('No usable text evidence in this context.');
  }

  const bundle = careerOsKnowledgeRuntimeBundle_(id, collected);
  const contextSpec = {
    contextId: id,
    label: context.getName(),
    contextKind: 'session'
  };

  const compiledRequest = CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE.buildSessionSynthesisPrompt({
    context: contextSpec,
    bundle: bundle
  });
  const synthesisStartedAt = Date.now();
  const rawSynthesis = careerOsVnextKnowledgeSynthesize_(compiledRequest, config);
  const synthesisMs = Date.now() - synthesisStartedAt;
  const synthesisValidation =
    CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE.validateSessionSynthesis({
      synthesis: rawSynthesis,
      bundle: bundle
    });

  if (!synthesisValidation.valid) {
    throw new Error(
      'Knowledge synthesis failed structural/evidence validation; no output published.'
    );
  }

  const synthesis = synthesisValidation.synthesis;
  const quality =
    CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE.evaluateSessionSynthesisQuality({
      synthesis: synthesis,
      bundle: bundle
    });

  let verificationState = {
    status: 'UNVERIFIED',
    promotable: false,
    reviewRequired: true,
    errors: [],
    verification: { verdicts: [], warnings: [] }
  };
  let verificationRuntimeStatus = config.verificationEnabled ? 'PENDING' : 'DISABLED';
  let verificationMs = null;

  if (config.verificationEnabled) {
    const verificationStartedAt = Date.now();
    try {
      const verificationRequest =
        CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE.buildSelectiveVerificationRequest({
          bundle: bundle,
          synthesis: synthesis,
          context: contextSpec
        });
      const rawVerification = careerOsVnextKnowledgeVerify_(
        verificationRequest,
        CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE.SELECTIVE_VERIFICATION_RESPONSE_SCHEMA,
        config
      );
      verificationState =
        CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE.summarizeVerificationState({
          result: rawVerification,
          synthesis: synthesis,
          bundle: bundle
        });
      verificationRuntimeStatus = 'COMPLETE';
    } catch (_error) {
      verificationState = {
        status: 'VERIFICATION_FAILED',
        promotable: false,
        reviewRequired: true,
        errors: [{ code: 'VERIFICATION_RUNTIME_FAILURE' }],
        verification: { verdicts: [], warnings: [] }
      };
      verificationRuntimeStatus = 'FAILED';
    }
    verificationMs = Date.now() - verificationStartedAt;
  }

  const companion = {
    schemaVersion: '0.2',
    artifactType: 'session_synthesis',
    generatedBy: 'career_os_knowledge_runtime',
    contextId: id,
    generatedAt: new Date().toISOString(),
    runtimeGitSha: CAREER_OS_BUILD_INFO.gitSha,
    provider: config.provider,
    models: {
      synthesis:
        config.runtimeModels.synthesis ||
        config.synthesisModel,
      verification:
        config.verificationEnabled
          ? (
              config.runtimeModels.verification ||
              config.verificationModel
            )
          : null
    },
    bundleId: bundle.bundleId,
    timings: {
      synthesisMs: synthesisMs,
      verificationMs: verificationMs,
      totalMs: null
    },
    qualityStatus: quality.pass ? 'PASS' : 'REVIEW_REQUIRED',
    quality: quality,
    verificationRuntimeStatus: verificationRuntimeStatus,
    verificationStatus: verificationState.status,
    verificationReviewRequired: verificationState.reviewRequired,
    verification: verificationState.verification,
    verificationErrors: verificationState.errors || [],
    automaticallyPromotable: false,
    publicationStatus: 'PARTIAL',
    coverage: bundle.coverage,
    exclusions: collected.exclusions,
    evidence: bundle.evidence.map(function(item) {
      // Persist provenance without duplicating private source bodies.
      return {
        evidenceId: item.evidenceId,
        artifactId: item.artifactId,
        sourceVersionKey: item.sourceVersionKey,
        processingIdentity: item.processingIdentity,
        modality: item.modality,
        anchor: item.anchor
      };
    }),
    synthesis: synthesis
  };

  const jsonFile = careerOsKnowledgeWriteOutput_(
    workspace,
    json,
    'SESSION_SYNTHESIS.json',
    JSON.stringify(companion, null, 2),
    'application/json',
    id
  );
  const mdFile = careerOsKnowledgeWriteOutput_(
    workspace,
    markdown,
    'SESSION_SYNTHESIS.md',
    careerOsKnowledgeRenderMarkdown_(companion, bundle),
    'text/markdown',
    id
  );

  companion.publicationStatus = 'COMPLETE';
  companion.timings.totalMs = Date.now() - totalStartedAt;
  jsonFile.setContent(JSON.stringify(companion, null, 2));

  return {
    ok: true,
    contextId: id,
    workspaceId: workspace.getId(),
    markdownId: mdFile.getId(),
    jsonId: jsonFile.getId(),
    provider: config.provider,
    synthesisModel:
      config.runtimeModels.synthesis ||
      config.synthesisModel,
    verificationModel:
      config.verificationEnabled
        ? (
            config.runtimeModels.verification ||
            config.verificationModel
          )
        : null,
    qualityStatus: companion.qualityStatus,
    verificationStatus: companion.verificationStatus,
    timings: companion.timings,
    coverage: bundle.coverage
  };
}

// Editor-friendly zero-argument invocation; private target remains outside Git.
function runKnowledgeCompilerStaging() {
  const props = careerOsVnextAssertLiveStagingProbe_();
  return runKnowledgeCompilerForContext(
    props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID')
  );
}

function careerOsKnowledgeHeader_(text) {
  const start = '=== CAREER OS ARTIFACT METADATA ===';
  const end = '=== END CAREER OS ARTIFACT METADATA ===';
  if (text.indexOf(start) !== 0 || text.indexOf(end) < 0) return {};

  const out = {};
  text
    .substring(start.length, text.indexOf(end))
    .split(/\r?\n/)
    .forEach(function(line) {
      const match = /^([^:]+):\s*(.*)$/.exec(line);
      if (match) out[match[1].trim()] = match[2].trim();
    });
  return out;
}

function careerOsKnowledgeCollectEvidence_(workspace, contextId) {
  const limits = CAREER_OS_KNOWLEDGE_RUNTIME_LIMITS;
  const files = [];
  const iterator = workspace.getFiles();

  while (iterator.hasNext()) {
    if (files.length >= limits.maxWorkspaceFiles) {
      throw new Error('Workspace file count exceeds compiler discovery budget.');
    }
    files.push(iterator.next());
  }

  files.sort(function(a, b) {
    return a.getId().localeCompare(b.getId());
  });

  const evidence = [];
  const exclusions = [];
  let chars = 0;
  let readBytes = 0;

  const sourceTypes = {
    audio_transcript: 'audio',
    image_ocr: 'image',
    image_ocr_text: 'image',
    image_visual_analysis_v1: 'image',
    pdf_text_extraction: 'document',
    text_artifact: 'text'
  };

  files.forEach(function(file) {
    const artifactId = file.getId();
    const name = file.getName();

    function exclude(reason, extra) {
      const item = { artifactId: artifactId, reason: reason };
      if (extra) {
        Object.keys(extra).forEach(function(key) {
          item[key] = extra[key];
        });
      }
      exclusions.push(item);
    }

    if (/^(SESSION_SYNTHESIS|COURSE_KNOWLEDGE|SESSION_VERIFICATION)(?:[._-]|$)/i.test(name)) {
      return exclude('derived_knowledge');
    }
    if (!/^(text\/plain|text\/markdown)$/.test(file.getMimeType())) {
      return exclude('non_text');
    }
    if (file.getSize() > limits.maxFileBytes) {
      return exclude('file_size_limit');
    }

    const meta = Drive.Files.get(artifactId, { fields: 'id,appProperties' });
    const props = meta.appProperties || {};

    if (
      props.careerOsSessionFolderId &&
      props.careerOsSessionFolderId !== contextId
    ) {
      return exclude('context_mismatch');
    }
    if (props.careerOsKnowledgeCompiler === 'true') {
      return exclude('derived_knowledge');
    }
    if (readBytes + file.getSize() > limits.maxReadBytes) {
      return exclude('read_byte_limit');
    }

    readBytes += file.getSize();
    const raw = file.getBlob().getDataAsString('UTF-8');
    const header = careerOsKnowledgeHeader_(raw);

    if (
      header.session_folder_drive_id &&
      header.session_folder_drive_id !== contextId
    ) {
      return exclude('context_mismatch');
    }
    if (header.artifact_type && !sourceTypes[header.artifact_type]) {
      return exclude('non_evidence_artifact');
    }
    if (
      props.careerOsGenerated === 'true' &&
      !sourceTypes[header.artifact_type]
    ) {
      return exclude('unclassified_generated_artifact');
    }
    if (!header.artifact_type && !/\.(txt|md)$/i.test(name)) {
      return exclude('non_evidence_artifact');
    }

    const body = stripPortableArtifactHeader_(raw);
    if (!body) return exclude('empty');
    if (evidence.length >= limits.maxEvidenceFiles) {
      return exclude('evidence_file_limit');
    }

    const count = Math.min(
      body.length,
      limits.maxArtifactChars,
      limits.maxTotalChars - chars
    );
    if (count <= 0) return exclude('total_character_limit');

    if (count < body.length) {
      exclude('truncated', { excludedChars: body.length - count });
    }

    evidence.push({
      evidenceId: 'artifact:' + artifactId + ':chars:0-' + count,
      artifactId: artifactId,
      sourceVersionKey:
        header.source_version_key ||
        JSON.stringify([
          artifactId,
          'modified:' + file.getLastUpdated().toISOString() + ':size:' + file.getSize()
        ]),
      processingIdentity: {
        processorName: header.processor_name || null,
        processorVersion: header.processor_version || null,
        processingProfileVersion: header.processing_profile_version || null
      },
      modality: sourceTypes[header.artifact_type] || 'text',
      anchor: {
        artifactId: artifactId,
        range: 'body UTF-16 characters',
        start: 0,
        end: count
      },
      content: body.substring(0, count)
    });

    chars += count;
  });

  const truncatedEvidenceIds = evidence
    .filter(function(item) {
      return exclusions.some(function(exclusion) {
        return (
          exclusion.artifactId === item.artifactId &&
          exclusion.reason === 'truncated'
        );
      });
    })
    .map(function(item) {
      return item.evidenceId;
    });

  return {
    evidence: evidence,
    exclusions: exclusions,
    coverage: {
      scope: 'existing_text_artifacts_only',
      workspaceFiles: files.length,
      sourceArtifactCount: files.length,
      candidateArtifactCount: evidence.length,
      selectedArtifactCount: evidence.length,
      includedArtifacts: evidence.length,
      includedChars: chars,
      selectedChars: chars,
      readBytes: readBytes,
      maxChars: limits.maxTotalChars,
      truncatedEvidenceIds: truncatedEvidenceIds,
      completeWithinTextScope: !exclusions.some(function(item) {
        return [
          'truncated',
          'read_byte_limit',
          'file_size_limit',
          'context_mismatch',
          'evidence_file_limit',
          'total_character_limit'
        ].indexOf(item.reason) >= 0;
      }),
      limits: limits
    }
  };
}

function careerOsKnowledgeRuntimeBundle_(contextId, collected) {
  const identity = collected.evidence
    .map(function(item) {
      return [
        item.evidenceId,
        item.sourceVersionKey,
        String((item.content || '').length)
      ].join('|');
    })
    .join('||');

  return {
    schemaVersion: '0.2',
    bundleId:
      'runtime-bundle-v1:' +
      contextId +
      ':' +
      careerOsKnowledgeStableHash_(identity),
    contextId: contextId,
    evidence: collected.evidence,
    evidenceIds: collected.evidence.map(function(item) {
      return item.evidenceId;
    }),
    sourceVersionKeys: collected.evidence.map(function(item) {
      return item.sourceVersionKey;
    }),
    coverage: collected.coverage,
    exclusions: collected.exclusions.map(function(item) {
      return item.artifactId + ':' + item.reason;
    })
  };
}

// Deterministic transient runtime identifier; not a cryptographic provenance primitive.
function careerOsKnowledgeStableHash_(text) {
  let hash = 2166136261;
  const value = String(text || '');
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}

function careerOsKnowledgeOutputTarget_(workspace, name, contextId) {
  const files = workspace.getFilesByName(name);
  let target = null;

  while (files.hasNext()) {
    const file = files.next();
    const props =
      Drive.Files.get(file.getId(), { fields: 'appProperties' }).appProperties ||
      {};
    if (
      target ||
      props.careerOsKnowledgeCompiler !== 'true' ||
      props.careerOsSessionFolderId !== contextId
    ) {
      throw new Error('Synthesis output name is occupied or ownership is ambiguous.');
    }
    target = file;
  }

  return target;
}

function careerOsKnowledgeWriteOutput_(
  workspace,
  target,
  name,
  content,
  mimeType,
  contextId
) {
  if (target) {
    target.setContent(content);
    return target;
  }

  const created = Drive.Files.create(
    {
      name: name,
      mimeType: mimeType,
      parents: [workspace.getId()],
      appProperties: {
        careerOsGenerated: 'true',
        careerOsKnowledgeCompiler: 'true',
        careerOsSessionFolderId: contextId
      }
    },
    Utilities.newBlob(content, mimeType, name),
    { fields: 'id' }
  );

  return DriveApp.getFileById(created.id);
}

function careerOsKnowledgeRenderMarkdown_(companion, bundle) {
  const lines = [];
  lines.push(
    'Derived synthesis. Automatic promotion is disabled.',
    '',
    'Generated: ' + companion.generatedAt,
    'Provider: ' + companion.provider,
    'Synthesis model: ' + companion.models.synthesis,
    'Verification model: ' + (companion.models.verification || 'disabled'),
    'Quality: ' + companion.qualityStatus + ' (' + companion.quality.score.toFixed(3) + ')',
    'Verification: ' + companion.verificationStatus,
    ''
  );

  lines.push(
    CAREER_OS_KNOWLEDGE_COMPILER_BRIDGE.renderSessionSynthesisMarkdown({
      synthesis: companion.synthesis,
      bundle: bundle
    }).trimEnd(),
    '',
    '## Verification',
    '',
    'Runtime status: ' + companion.verificationRuntimeStatus,
    'State: ' + companion.verificationStatus,
    'Review required: ' + String(companion.verificationReviewRequired)
  );

  if (companion.verification.verdicts.length) {
    companion.verification.verdicts.forEach(function(item) {
      lines.push(
        '',
        '- Topic ' +
          item.topicIndex +
          ': ' +
          item.verdict +
          (item.qualifications && item.qualifications.length
            ? ' — ' + item.qualifications.join('; ')
            : '')
      );
    });
  } else {
    lines.push('', '_No completed topic verdicts._');
  }

  if (companion.quality.failures && companion.quality.failures.length) {
    lines.push(
      '',
      '## Quality Gate Findings',
      '',
      companion.quality.failures.map(function(item) {
        return '- ' + item;
      }).join('\n')
    );
  }

  lines.push(
    '',
    '## Runtime Coverage / Exclusions',
    '',
    JSON.stringify(
      {
        coverage: companion.coverage,
        exclusions: companion.exclusions
      },
      null,
      2
    ),
    '',
    'Structured companion: SESSION_SYNTHESIS.json',
    ''
  );

  return lines.join('\n');
}
