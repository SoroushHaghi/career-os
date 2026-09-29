import {
  createEvidenceBundle,
  createSynthesisClaim,
  validateSynthesisClaims,
} from './verified-synthesis.mjs';

export const KNOWLEDGE_COMPILER_SELECTION_POLICY = 'knowledge-compiler-selection-v1';

export const SESSION_SYNTHESIS_RESPONSE_SCHEMA = Object.freeze({
  type: 'object',
  required: [
    'title',
    'executive_summary',
    'topic_blocks',
    'uncertainties',
    'conflicts',
    'coverage',
  ],
  properties: {
    title: { type: 'string' },
    executive_summary: { type: 'string' },
    topic_blocks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'explanation', 'evidence_refs'],
        properties: {
          title: { type: 'string' },
          explanation: { type: 'string' },
          definitions: { type: 'array', items: { type: 'string' } },
          formulas: { type: 'array', items: { type: 'string' } },
          examples: { type: 'array', items: { type: 'string' } },
          lecturer_emphasis: { type: 'array', items: { type: 'string' } },
          evidence_refs: { type: 'array', items: { type: 'string' } },
          uncertainties: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    uncertainties: {
      type: 'array',
      items: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string' },
          evidence_refs: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    conflicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['subject', 'evidence_refs'],
        properties: {
          subject: { type: 'string' },
          description: { type: 'string' },
          evidence_refs: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    coverage: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        included_evidence_refs: { type: 'array', items: { type: 'string' } },
        excluded_evidence_refs: { type: 'array', items: { type: 'string' } },
      },
    },
  },
});

const GENERATED_ARTIFACT_RE =
  /(^|\/)(session[_ -]?synthesis|knowledge[_ -]?compiler|verification[_ -]?report|course[_ -]?knowledge)(\.|_|-|$)/i;

function asText(value) {
  return value == null ? '' : String(value);
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(String).filter(Boolean))];
}

function artifactName(artifact = {}) {
  return asText(
    artifact.name ??
      artifact.fileName ??
      artifact.title ??
      artifact.artifactName ??
      artifact.path ??
      ''
  );
}

export function isGeneratedKnowledgeArtifact(artifact = {}) {
  if (artifact.generated === true) return true;
  const kind = asText(artifact.kind ?? artifact.artifactKind ?? '').toLowerCase();
  if (['synthesis', 'knowledge_synthesis', 'verification_report'].includes(kind)) {
    return true;
  }
  return GENERATED_ARTIFACT_RE.test(artifactName(artifact));
}

function toEvidenceUnit(artifact, index) {
  const evidenceId = asText(
    artifact.evidenceId ??
      artifact.artifactId ??
      artifact.sourceKey ??
      `artifact:${index + 1}`
  ).trim();
  const sourceVersionKey = asText(
    artifact.sourceVersionKey ??
      artifact.versionKey ??
      artifact.contentFingerprint ??
      `unknown-version:${evidenceId}`
  ).trim();
  return {
    evidenceId,
    sourceVersionKey,
    content: asText(artifact.content ?? artifact.text),
    modality: artifact.modality == null ? null : String(artifact.modality),
    anchor: artifact.anchor ?? null,
    sourceName: artifactName(artifact) || null,
  };
}

function clipEvidenceFairly(evidence, maxChars) {
  const nonEmpty = evidence.filter((item) => item.content.trim());
  if (!nonEmpty.length || maxChars <= 0) return [];

  const totalChars = nonEmpty.reduce((sum, item) => sum + item.content.length, 0);
  if (totalChars <= maxChars) {
    return nonEmpty.map((item) => ({ ...item, truncated: false }));
  }

  const floorPerItem = Math.max(256, Math.floor(maxChars / (nonEmpty.length * 2)));
  let remaining = maxChars;
  const allocations = nonEmpty.map((item) => {
    const allocation = Math.min(item.content.length, floorPerItem, remaining);
    remaining -= allocation;
    return allocation;
  });

  while (remaining > 0) {
    let progressed = false;
    for (let i = 0; i < nonEmpty.length && remaining > 0; i += 1) {
      const available = nonEmpty[i].content.length - allocations[i];
      if (available <= 0) continue;
      const share = Math.min(available, Math.max(1, Math.floor(remaining / nonEmpty.length)));
      allocations[i] += share;
      remaining -= share;
      progressed = true;
    }
    if (!progressed) break;
  }

  return nonEmpty.map((item, index) => ({
    ...item,
    content: item.content.slice(0, allocations[index]),
    truncated: allocations[index] < item.content.length,
  }));
}

export function selectCompilationEvidence({
  artifacts = [],
  maxChars = 120000,
} = {}) {
  if (!Number.isFinite(maxChars) || maxChars < 1) {
    throw new TypeError('maxChars must be a positive finite number');
  }

  const exclusions = [];
  const candidates = [];

  artifacts.forEach((artifact, index) => {
    if (isGeneratedKnowledgeArtifact(artifact)) {
      exclusions.push({
        artifactRef: asText(
          artifact.artifactId ?? artifact.evidenceId ?? artifactName(artifact) ?? index
        ),
        reason: 'GENERATED_ARTIFACT_SELF_EXCLUDED',
      });
      return;
    }

    const evidence = toEvidenceUnit(artifact, index);
    if (!evidence.content.trim()) {
      exclusions.push({
        artifactRef: evidence.evidenceId,
        reason: 'EMPTY_TEXT',
      });
      return;
    }
    candidates.push(evidence);
  });

  const selected = clipEvidenceFairly(candidates, maxChars);
  const selectedIds = new Set(selected.map((item) => item.evidenceId));
  for (const candidate of candidates) {
    if (!selectedIds.has(candidate.evidenceId)) {
      exclusions.push({
        artifactRef: candidate.evidenceId,
        reason: 'CONTEXT_BUDGET_EXCLUDED',
      });
    }
  }

  const truncated = selected
    .filter((item) => item.truncated)
    .map((item) => item.evidenceId);

  return {
    evidence: selected.map(({ truncated: _truncated, ...item }) => item),
    coverage: {
      sourceArtifactCount: artifacts.length,
      candidateArtifactCount: candidates.length,
      selectedArtifactCount: selected.length,
      selectedChars: selected.reduce((sum, item) => sum + item.content.length, 0),
      maxChars,
      truncatedEvidenceIds: truncated,
    },
    exclusions,
  };
}

export function buildCompilerEvidenceBundle({
  contextId,
  artifacts,
  privacyDecisionId,
  maxChars = 120000,
  selectionPolicyVersion = KNOWLEDGE_COMPILER_SELECTION_POLICY,
} = {}) {
  const selected = selectCompilationEvidence({ artifacts, maxChars });
  if (!selected.evidence.length) {
    throw new TypeError('no eligible textual evidence for compilation');
  }

  return createEvidenceBundle({
    contextId,
    selectionPolicyVersion,
    privacyDecisionId,
    evidence: selected.evidence,
    coverage: selected.coverage,
    exclusions: selected.exclusions.map(
      (item) => `${item.artifactRef}:${item.reason}`
    ),
  });
}

export function buildSessionSynthesisPrompt({
  context,
  bundle,
} = {}) {
  if (!context?.contextId) throw new TypeError('context.contextId is required');
  if (!bundle?.bundleId || !Array.isArray(bundle.evidence)) {
    throw new TypeError('bundle is required');
  }

  const evidenceText = bundle.evidence
    .map((item) => {
      const anchor = item.anchor == null ? '' : ` anchor=${JSON.stringify(item.anchor)}`;
      return [
        `<evidence id="${item.evidenceId}" modality="${item.modality ?? 'text'}"${anchor}>`,
        item.content ?? '',
        '</evidence>',
      ].join('\n');
    })
    .join('\n\n');

  const systemInstruction = [
    'You are the Career OS Session Knowledge Compiler.',
    'Create a clean, concept-oriented synthesis from the supplied source-faithful evidence.',
    'Fuse overlapping explanations across sources instead of concatenating files.',
    'Do not invent missing facts or silently repair uncertain source material.',
    'When transcription/OCR appears corrupt or ambiguous, preserve that uncertainty explicitly.',
    'Every material topic must cite only evidence IDs supplied in this request.',
    'Keep source-supported statements distinct from inference.',
    'Prefer course/lecturer terminology when the evidence supports it.',
    'Return only the requested structured object.',
  ].join(' ');

  const userPrompt = [
    `Context: ${context.label ?? context.contextId}`,
    `Context kind: ${context.contextKind ?? 'session'}`,
    `Evidence bundle: ${bundle.bundleId}`,
    '',
    'Required synthesis behavior:',
    '- organize by concepts/topics;',
    '- merge duplicates and repeated explanations;',
    '- retain definitions, formulas, examples, and lecturer emphasis;',
    '- expose conflicts and likely ASR/OCR corruption;',
    '- provide evidence_refs for every material topic;',
    '- report coverage honestly.',
    '',
    evidenceText,
  ].join('\n');

  return {
    schemaVersion: '0.1',
    bundleId: bundle.bundleId,
    systemInstruction,
    userPrompt,
    responseSchema: SESSION_SYNTHESIS_RESPONSE_SCHEMA,
  };
}

function normalizeUncertainty(item) {
  if (typeof item === 'string') {
    return { text: item, evidenceRefs: [] };
  }
  return {
    text: asText(item?.text).trim(),
    evidenceRefs: uniqueStrings(item?.evidence_refs ?? item?.evidenceRefs ?? []),
  };
}

function normalizeConflict(item) {
  return {
    subject: asText(item?.subject).trim(),
    description: asText(item?.description).trim(),
    evidenceRefs: uniqueStrings(item?.evidence_refs ?? item?.evidenceRefs ?? []),
  };
}

export function normalizeSessionSynthesis(result = {}) {
  return {
    title: asText(result.title).trim(),
    executiveSummary: asText(
      result.executive_summary ?? result.executiveSummary
    ).trim(),
    topicBlocks: (result.topic_blocks ?? result.topicBlocks ?? []).map((topic) => ({
      title: asText(topic?.title).trim(),
      explanation: asText(topic?.explanation).trim(),
      definitions: uniqueStrings(topic?.definitions ?? []),
      formulas: uniqueStrings(topic?.formulas ?? []),
      examples: uniqueStrings(topic?.examples ?? []),
      lecturerEmphasis: uniqueStrings(
        topic?.lecturer_emphasis ?? topic?.lecturerEmphasis ?? []
      ),
      evidenceRefs: uniqueStrings(
        topic?.evidence_refs ?? topic?.evidenceRefs ?? []
      ),
      uncertainties: uniqueStrings(topic?.uncertainties ?? []),
    })),
    uncertainties: (result.uncertainties ?? []).map(normalizeUncertainty),
    conflicts: (result.conflicts ?? []).map(normalizeConflict),
    coverage: {
      summary: asText(result.coverage?.summary).trim(),
      includedEvidenceRefs: uniqueStrings(
        result.coverage?.included_evidence_refs ??
          result.coverage?.includedEvidenceRefs ??
          []
      ),
      excludedEvidenceRefs: uniqueStrings(
        result.coverage?.excluded_evidence_refs ??
          result.coverage?.excludedEvidenceRefs ??
          []
      ),
    },
  };
}

export function validateSessionSynthesis({
  synthesis,
  bundle,
} = {}) {
  if (!bundle?.bundleId || !Array.isArray(bundle.evidenceIds)) {
    throw new TypeError('bundle is required');
  }
  const normalized = normalizeSessionSynthesis(synthesis);
  const allowed = new Set(bundle.evidenceIds.map(String));
  const errors = [];
  const unknown = new Set();

  if (!normalized.title) errors.push({ code: 'MISSING_TITLE' });
  if (!normalized.executiveSummary) {
    errors.push({ code: 'MISSING_EXECUTIVE_SUMMARY' });
  }
  if (!normalized.topicBlocks.length) {
    errors.push({ code: 'MISSING_TOPIC_BLOCKS' });
  }

  const inspectRefs = (refs, owner) => {
    for (const ref of refs) {
      if (!allowed.has(ref)) {
        unknown.add(ref);
        errors.push({ code: 'UNKNOWN_EVIDENCE_REF', owner, evidenceRef: ref });
      }
    }
  };

  normalized.topicBlocks.forEach((topic, index) => {
    if (!topic.title || !topic.explanation) {
      errors.push({ code: 'INCOMPLETE_TOPIC_BLOCK', index });
    }
    if (!topic.evidenceRefs.length) {
      errors.push({ code: 'TOPIC_WITHOUT_EVIDENCE', index });
    }
    inspectRefs(topic.evidenceRefs, `topic:${index}`);
  });
  normalized.uncertainties.forEach((item, index) => {
    inspectRefs(item.evidenceRefs, `uncertainty:${index}`);
  });
  normalized.conflicts.forEach((item, index) => {
    inspectRefs(item.evidenceRefs, `conflict:${index}`);
  });
  inspectRefs(normalized.coverage.includedEvidenceRefs, 'coverage:included');
  inspectRefs(normalized.coverage.excludedEvidenceRefs, 'coverage:excluded');

  return {
    valid: errors.length === 0,
    errors,
    unknownEvidenceRefs: [...unknown].sort(),
    synthesis: normalized,
  };
}

export function synthesisToClaims({
  synthesis,
  bundle,
  synthesisRunId = null,
} = {}) {
  const validation = validateSessionSynthesis({ synthesis, bundle });
  const claims = validation.synthesis.topicBlocks
    .filter((topic) => topic.explanation)
    .map((topic) =>
      createSynthesisClaim({
        bundleId: bundle.bundleId,
        text: `${topic.title}: ${topic.explanation}`,
        supportStatus:
          topic.uncertainties.length > 0 ? 'PARTIALLY_SUPPORTED' : 'SUPPORTED',
        evidenceRefs: topic.evidenceRefs,
        uncertainties: topic.uncertainties,
        synthesisRunId,
        claimType: 'TOPIC_SYNTHESIS',
      })
    );

  return validateSynthesisClaims({ bundle, claims });
}

function markdownList(items, empty = '_None identified._') {
  if (!items?.length) return empty;
  return items.map((item) => `- ${item}`).join('\n');
}

export function renderSessionSynthesisMarkdown({
  synthesis,
  bundle = null,
} = {}) {
  const normalized = normalizeSessionSynthesis(synthesis);
  const out = [
    `# ${normalized.title || 'Session Synthesis'}`,
    '',
    '## Executive Summary',
    '',
    normalized.executiveSummary || '_No summary generated._',
    '',
  ];

  for (const topic of normalized.topicBlocks) {
    out.push(`## ${topic.title}`, '', topic.explanation, '');
    if (topic.definitions.length) {
      out.push('### Definitions', '', markdownList(topic.definitions), '');
    }
    if (topic.formulas.length) {
      out.push('### Formulas', '', markdownList(topic.formulas), '');
    }
    if (topic.examples.length) {
      out.push('### Examples', '', markdownList(topic.examples), '');
    }
    if (topic.lecturerEmphasis.length) {
      out.push(
        '### Lecturer Emphasis',
        '',
        markdownList(topic.lecturerEmphasis),
        ''
      );
    }
    if (topic.uncertainties.length) {
      out.push('### Uncertainties', '', markdownList(topic.uncertainties), '');
    }
    out.push(
      '### Evidence',
      '',
      markdownList(topic.evidenceRefs.map((ref) => `\`${ref}\``)),
      ''
    );
  }

  out.push(
    '## Global Uncertainties',
    '',
    markdownList(
      normalized.uncertainties
        .filter((item) => item.text)
        .map((item) =>
          item.evidenceRefs.length
            ? `${item.text} [${item.evidenceRefs.join(', ')}]`
            : item.text
        )
    ),
    '',
    '## Conflicts',
    '',
    markdownList(
      normalized.conflicts
        .filter((item) => item.subject)
        .map((item) =>
          `${item.subject}: ${item.description || 'source disagreement'} [${item.evidenceRefs.join(', ')}]`
        )
    ),
    '',
    '## Coverage',
    '',
    normalized.coverage.summary || '_No coverage summary generated._',
    ''
  );

  if (bundle?.bundleId) {
    out.push(
      `Evidence bundle: \`${bundle.bundleId}\``,
      '',
      `Selected evidence units: ${bundle.evidenceIds?.length ?? 0}`,
      ''
    );
  }

  return out.join('\n').trimEnd() + '\n';
}
