// Manual integration only. No scanner, queue, trigger or promotion registration.
const CAREER_OS_KNOWLEDGE_RUNTIME_LIMITS = {
  maxWorkspaceFiles: 200, maxEvidenceFiles: 40,
  maxFileBytes: 512000, maxReadBytes: 4000000, maxArtifactChars: 16000, maxTotalChars: 60000
};

// contextId is the session Drive folder ID (not the _AI_WORKSPACE folder ID).
function runKnowledgeCompilerForContext(contextId) {
  const config = careerOsKnowledgeProviderConfig_();
  const id = String(contextId || '').trim();
  if (!id || !careerOsVnextAuthorizedContextIds_()[id]) {
    throw new Error('Knowledge context must be explicitly staging-authorized.');
  }
  const context = DriveApp.getFolderById(id);
  const workspace = getOrCreateSessionWorkspaceFolder_(context, false);
  if (!workspace) throw new Error('Context has no existing _AI_WORKSPACE.');
  // Fail before spending a provider call if a user-owned output name is occupied.
  const markdown = careerOsKnowledgeOutputTarget_(workspace, 'SESSION_SYNTHESIS.md', id);
  const json = careerOsKnowledgeOutputTarget_(workspace, 'SESSION_SYNTHESIS.json', id);
  const bundle = careerOsKnowledgeCollectEvidence_(workspace, id);
  if (!bundle.evidence.length) throw new Error('No usable text evidence in this context.');
  const request = CAREER_OS_KNOWLEDGE_BRIDGE.buildEnrichmentRequest({
    context: { contextId: id, label: context.getName(), contextKind: 'session' },
    evidenceBundle: bundle
  });
  request.coverage = bundle.coverage;
  request.exclusions = bundle.exclusions;
  const raw = careerOsVnextKnowledgeSynthesize_(request, config);
  const result = careerOsKnowledgeValidateResult_(raw, bundle.evidence);
  const companion = {
    schemaVersion: '0.1', artifactType: 'session_synthesis',
    generatedBy: 'career_os_knowledge_runtime', contextId: id,
    generatedAt: new Date().toISOString(), runtimeGitSha: CAREER_OS_BUILD_INFO.gitSha,
    provider: config.provider, model: config.model,
    verificationStatus: 'UNVERIFIED', automaticallyPromotable: false,
    publicationStatus: 'PARTIAL',
    coverage: bundle.coverage, exclusions: bundle.exclusions,
    evidence: bundle.evidence.map(function(item) {
      // Persist provenance without duplicating the private source body.
      return { evidenceId: item.evidenceId, artifactId: item.artifactId,
        sourceVersionKey: item.sourceVersionKey, processingIdentity: item.processingIdentity,
        modality: item.modality, anchor: item.anchor };
    }),
    synthesis: result
  };
  const jsonFile = careerOsKnowledgeWriteOutput_(workspace, json, 'SESSION_SYNTHESIS.json',
    JSON.stringify(companion, null, 2), 'application/json', id);
  const mdFile = careerOsKnowledgeWriteOutput_(workspace, markdown, 'SESSION_SYNTHESIS.md',
    careerOsKnowledgeRenderMarkdown_(context.getName(), companion), 'text/markdown', id);
  companion.publicationStatus = 'COMPLETE';
  jsonFile.setContent(JSON.stringify(companion, null, 2));
  return { ok: true, contextId: id, workspaceId: workspace.getId(),
    markdownId: mdFile.getId(), jsonId: jsonFile.getId(), provider: config.provider,
    model: config.model, verificationStatus: 'UNVERIFIED', coverage: bundle.coverage };
}

// Editor-friendly zero-argument invocation; the private target stays out of Git.
function runKnowledgeCompilerStaging() {
  const props = careerOsVnextAssertLiveStagingProbe_();
  return runKnowledgeCompilerForContext(props.getProperty('CAREER_OS_STAGING_TEST_FOLDER_ID'));
}

function careerOsKnowledgeHeader_(text) {
  const start = '=== CAREER OS ARTIFACT METADATA ===';
  const end = '=== END CAREER OS ARTIFACT METADATA ===';
  if (text.indexOf(start) !== 0 || text.indexOf(end) < 0) return {};
  const out = {};
  text.substring(start.length, text.indexOf(end)).split(/\r?\n/).forEach(function(line) {
    const match = /^([^:]+):\s*(.*)$/.exec(line);
    if (match) out[match[1].trim()] = match[2].trim();
  });
  return out;
}

function careerOsKnowledgeCollectEvidence_(workspace, contextId) {
  const limits = CAREER_OS_KNOWLEDGE_RUNTIME_LIMITS;
  const files = [], iterator = workspace.getFiles();
  while (iterator.hasNext()) {
    if (files.length >= limits.maxWorkspaceFiles) {
      throw new Error('Workspace file count exceeds compiler discovery budget.');
    }
    files.push(iterator.next());
  }
  files.sort(function(a, b) { return a.getId().localeCompare(b.getId()); });
  const evidence = [], exclusions = [];
  let chars = 0, readBytes = 0;
  const sourceTypes = {
    audio_transcript: 'audio', image_ocr: 'image', image_ocr_text: 'image',
    image_visual_analysis_v1: 'image', pdf_text_extraction: 'document', text_artifact: 'text'
  };
  files.forEach(function(file) {
    const artifactId = file.getId(), name = file.getName();
    function exclude(reason) { exclusions.push({ artifactId: artifactId, reason: reason }); }
    // Name check precedes any body read; metadata/type checks also protect renamed outputs.
    if (/^SESSION_SYNTHESIS(?:[._-]|$)/i.test(name)) return exclude('derived_synthesis');
    if (!/^(text\/plain|text\/markdown)$/.test(file.getMimeType())) return exclude('non_text');
    if (file.getSize() > limits.maxFileBytes) return exclude('file_size_limit');
    const meta = Drive.Files.get(artifactId, { fields: 'id,appProperties' });
    const props = meta.appProperties || {};
    if (props.careerOsSessionFolderId && props.careerOsSessionFolderId !== contextId) {
      return exclude('context_mismatch');
    }
    if (props.careerOsKnowledgeCompiler === 'true') return exclude('derived_synthesis');
    if (readBytes + file.getSize() > limits.maxReadBytes) return exclude('read_byte_limit');
    readBytes += file.getSize();
    const raw = file.getBlob().getDataAsString('UTF-8');
    const header = careerOsKnowledgeHeader_(raw);
    if (header.session_folder_drive_id && header.session_folder_drive_id !== contextId) {
      return exclude('context_mismatch');
    }
    if (header.artifact_type && !sourceTypes[header.artifact_type]) return exclude('non_evidence_artifact');
    if (props.careerOsGenerated === 'true' && !sourceTypes[header.artifact_type]) {
      return exclude('unclassified_generated_artifact');
    }
    if (!header.artifact_type && !/\.(txt|md)$/i.test(name)) return exclude('non_evidence_artifact');
    const body = stripPortableArtifactHeader_(raw);
    if (!body) return exclude('empty');
    if (evidence.length >= limits.maxEvidenceFiles) return exclude('evidence_file_limit');
    const count = Math.min(body.length, limits.maxArtifactChars, limits.maxTotalChars - chars);
    if (count <= 0) return exclude('total_character_limit');
    if (count < body.length) exclusions.push({ artifactId: artifactId, reason: 'truncated',
      excludedChars: body.length - count });
    evidence.push({
      evidenceId: 'artifact:' + artifactId + ':chars:0-' + count,
      artifactId: artifactId,
      sourceVersionKey: header.source_version_key || JSON.stringify([artifactId,
        'modified:' + file.getLastUpdated().toISOString() + ':size:' + file.getSize()]),
      processingIdentity: { processorName: header.processor_name || null,
        processorVersion: header.processor_version || null,
        processingProfileVersion: header.processing_profile_version || null },
      modality: sourceTypes[header.artifact_type] || 'text',
      anchor: { artifactId: artifactId, range: 'body UTF-16 characters', start: 0, end: count },
      content: body.substring(0, count)
    });
    chars += count;
  });
  return { evidence: evidence, exclusions: exclusions, coverage: {
    scope: 'existing_text_artifacts_only', workspaceFiles: files.length,
    includedArtifacts: evidence.length, includedChars: chars, readBytes: readBytes,
    completeWithinTextScope: !exclusions.some(function(item) {
      return ['truncated', 'read_byte_limit', 'file_size_limit', 'context_mismatch',
        'evidence_file_limit', 'total_character_limit'].indexOf(item.reason) >= 0;
    }), limits: limits
  } };
}

function careerOsKnowledgeValidateResult_(raw, evidence) {
  if (!raw || !Array.isArray(raw.topics) || !raw.topics.length ||
      !Array.isArray(raw.relations) || !Array.isArray(raw.conflicts) || !Array.isArray(raw.warnings)) {
    throw new Error('Invalid structured enrichment result; no output published.');
  }
  raw.topics.forEach(function(topic) {
    if (!topic || typeof topic.title !== 'string' || !topic.title.trim() ||
        typeof topic.explanation !== 'string' || !topic.explanation.trim() ||
        !Array.isArray(topic.evidenceIds) || !topic.evidenceIds.length) {
      throw new Error('Invalid synthesis topic or missing evidence references.');
    }
  });
  raw.relations.concat(raw.conflicts).forEach(function(item) {
    if (!item || !Array.isArray(item.evidenceIds) || !item.evidenceIds.length) {
      throw new Error('Invalid enrichment evidence references.');
    }
  });
  const result = CAREER_OS_KNOWLEDGE_BRIDGE.normalizeEnrichmentResult(raw);
  const check = CAREER_OS_KNOWLEDGE_BRIDGE.validateEnrichmentEvidenceRefs(result,
    evidence.map(function(item) { return item.evidenceId; }));
  if (!check.valid) throw new Error('Synthesis contains unknown evidence references.');
  // Runtime integration does not run promotion or claim semantic verification.
  result.promotionCandidates = [];
  return result;
}

function careerOsKnowledgeOutputTarget_(workspace, name, contextId) {
  const files = workspace.getFilesByName(name);
  let target = null;
  while (files.hasNext()) {
    const file = files.next();
    const props = Drive.Files.get(file.getId(), { fields: 'appProperties' }).appProperties || {};
    if (target || props.careerOsKnowledgeCompiler !== 'true' || props.careerOsSessionFolderId !== contextId) {
      throw new Error('Synthesis output name is occupied or ownership is ambiguous.');
    }
    target = file;
  }
  return target;
}

function careerOsKnowledgeWriteOutput_(workspace, target, name, content, mimeType, contextId) {
  if (target) {
    target.setContent(content);
    return target;
  }
  // Create media and ownership together; do not silently ignore provenance write errors.
  const created = Drive.Files.create({ name: name, mimeType: mimeType,
    parents: [workspace.getId()], appProperties: {
      careerOsGenerated: 'true', careerOsKnowledgeCompiler: 'true',
      careerOsSessionFolderId: contextId
    } }, Utilities.newBlob(content, mimeType, name), { fields: 'id' });
  return DriveApp.getFileById(created.id);
}

function careerOsKnowledgeRenderMarkdown_(title, companion) {
  const lines = ['# ' + title, '', 'Derived synthesis — UNVERIFIED. No automatic promotion.', '',
    'Generated: ' + companion.generatedAt, 'Provider/model: ' + companion.provider + '/' + companion.model,
    '', '## Topics'];
  companion.synthesis.topics.forEach(function(topic) {
    lines.push('', '### ' + topic.title, '', topic.explanation, '',
      'Evidence: ' + topic.evidenceIds.join(', '));
  });
  lines.push('', '## Conflicts / warnings', '', JSON.stringify({
    conflicts: companion.synthesis.conflicts, warnings: companion.synthesis.warnings
  }, null, 2), '', '## Coverage / exclusions', '', JSON.stringify({
    coverage: companion.coverage, exclusions: companion.exclusions
  }, null, 2), '', 'Structured provenance and relations: SESSION_SYNTHESIS.json', '');
  return lines.join('\n');
}
