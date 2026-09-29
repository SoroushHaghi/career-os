import { COURSE_KNOWLEDGE_VERSION } from './cross-session.mjs';

// No HTML execution or external links. Keep mathematical notation readable.
const md = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const code = value => '`' + String(value ?? '').replace(/`/g, '′').replace(/[\r\n]/g, ' ') + '`';
function lineage(items = []) {
  return items.map(l => {
    const refs = (l.evidenceRefs ?? []).map(e => typeof e === 'string' ? e : `${e.evidenceId}${e.sourceVersionKey ? '@' + e.sourceVersionKey : ''}`);
    return `${code(l.sessionId)} / ${code(l.synthesisVersion)}${refs.length ? ': ' + refs.map(code).join(', ') : ' (session reference only)'}; verification=${code(JSON.stringify(l.verification ?? 'UNVERIFIED'))}`;
  }).join('; ');
}
function warning(item) {
  const body = item.text ?? item.description ?? item.subject ?? 'Unresolved';
  const sources = Array.isArray(item.lineage) ? item.lineage : item.lineage ? [item.lineage] : [];
  return `- ${md(body)}${item.subject ? ' — ' + md(item.subject) : ''}${item.status ? ' [' + md(item.status) + ']' : ''}${item.origin ? ' [' + md(item.origin) + ']' : ''}${item.detailIds?.length ? ' — ' + item.detailIds.map(code).join(', ') : ''}${sources.length ? '\n  Sources: ' + lineage(sources) : ''}${item.evidenceRefs?.length ? '\n  Evidence: ' + item.evidenceRefs.map(code).join(', ') : ''}`;
}
export function renderCourseKnowledgeMarkdown(course) {
  if (course?.consolidationVersion !== COURSE_KNOWLEDGE_VERSION) throw new TypeError('unsupported course knowledge version');
  const out = [
    '---', 'artifact_type: course_knowledge', 'generated: true', 'source_evidence: false', '---', '',
    `# ${md(course.course.title)}`, '',
    `Course: ${code(course.course.courseId)} · Revision: ${code(course.revisionId)}`, '',
    '**Derived knowledge — UNVERIFIED; no automatic promotion.** Source-linked means cited by a session synthesis, not independently verified here. All session versions remain visible; newer versions do not silently supersede older ones.', '',
    `Coverage: ${course.coverage.sessions} sessions / ${course.coverage.sessionVersions} synthesis versions; ${course.coverage.topicBlocks} topic blocks → ${course.concepts.length} concepts.`, '',
    `Semantic reconciliation: ${course.coverage.semanticReconciliation ? 'applied (unverified)' : 'not applied; exact concept keys only'}. General semantic contradictions require provider review.`, '',
  ];
  for (const concept of course.concepts) {
    out.push(`## ${md(concept.title)}`, '', `Concept: ${code(concept.conceptId)}`, '',
      `Aliases: ${concept.aliases.map(md).join('; ')}`, '',
      '### Representative explanation', '',
      `${md(concept.canonicalExplanation?.text ?? 'None')}\n\n_Representative only; consult alternatives, uncertainty and conflicts below._`, '');
    const kinds = [
      ['explanation', 'Explanations and alternatives'], ['definitions', 'Definitions'],
      ['formulas', 'Formulas'], ['examples', 'Examples'], ['lecturerEmphasis', 'Lecturer emphasis'],
    ];
    for (const [kind, label] of kinds) {
      const details = concept.details.filter(d => d.kind === kind);
      if (!details.length) continue;
      out.push(`### ${label}`, '');
      for (const d of details) {
        out.push(`- ${md(d.text)} [${md(d.origin)}; ${md(d.supportStatus)}]`,
          `  Detail: ${code(d.detailId)}`, `  Sources: ${lineage(d.lineage)}`);
        if (d.scope) out.push(`  Scope: ${md(d.scope)}`);
        if (d.variants.length > 1) out.push(`  Preserved wording: ${d.variants.map(md).join(' | ')}`);
        if (d.uncertainties.length) out.push(`  **Uncertain:** ${d.uncertainties.map(md).join('; ')}`);
      }
      out.push('');
    }
    for (const [field, title] of [['conflicts','Conflicts'],['uncertainties','Uncertainties'],['unresolvedQuestions','Unresolved questions']]) {
      if (concept[field].length) out.push(`### ${title}`, '', ...concept[field].map(warning), '');
    }
    out.push('### Contributions by session/version', '', ...concept.additionsBySession.map(a =>
      `- ${code(a.sessionId)} / ${code(a.synthesisVersion)}: ${a.detailIds.map(code).join(', ')}`), '');
  }
  for (const [field, title] of [['conflicts','Course conflicts'],['uncertainties','Course uncertainties'],['unresolvedQuestions','Unresolved questions']]) {
    out.push(`## ${title}`, '', ...(course[field].length ? course[field].map(warning) : ['_None recorded; absence is not a verification result._']), '');
  }
  out.push('## Cross-session inference', '', ...course.inferences.map(i => `- ${md(i.text)} [INFERENCE; UNVERIFIED]\n  Topic references: ${i.topicRefs.map(code).join(', ')}\n  Sources: ${lineage(i.lineage)}`), '');
  if (!course.inferences.length) out.push('_None generated._', '');
  out.push('## Source coverage and exclusions', '');
  for (const c of course.coverage.sourceCoverage) out.push(
    `- ${code(c.sessionId)} / ${code(c.synthesisVersion)}`,
    `  Coverage: ${code(JSON.stringify(c.coverage))}`,
    `  Runtime coverage: ${code(JSON.stringify(c.runtimeCoverage))}`,
    `  Exclusions: ${code(JSON.stringify(c.exclusions))}`);
  out.push('', 'Structured companion: COURSE_KNOWLEDGE.json. Generated course artifacts must never be used as session source evidence.', '');
  return out.join('\n');
}

// Pure artifact descriptors: persistence belongs to a future explicitly authorized adapter.
export function createCourseKnowledgeArtifacts(course) {
  return [
    { name: 'COURSE_KNOWLEDGE.md', artifactType: 'course_knowledge', generated: true,
      mimeType: 'text/markdown', content: renderCourseKnowledgeMarkdown(course) },
    { name: 'COURSE_KNOWLEDGE.json', artifactType: 'course_knowledge', generated: true,
      mimeType: 'application/json', content: JSON.stringify(course, null, 2) + '\n' },
  ];
}
