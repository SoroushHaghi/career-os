import test from 'node:test';
import assert from 'node:assert/strict';
import { consolidateCourseKnowledge as consolidate, buildCourseConsolidationRequest as request,
  isCourseKnowledgeArtifact } from '../packages/knowledge/src/cross-session.mjs';
import { createCourseKnowledgeArtifacts, renderCourseKnowledgeMarkdown } from '../packages/knowledge/src/course-renderer.mjs';
import { selectCompilationEvidence } from '../packages/knowledge/src/compiler.mjs';

const course = { courseId: 'synthetic-course', title: 'Synthetic Course' };
const topic = (overrides = {}) => ({ title: 'Sample concept', explanation: 'A synthetic explanation.',
  definitions: ['A synthetic definition.'], formulas: [], examples: [], lecturerEmphasis: [],
  evidenceRefs: ['e1'], uncertainties: [], ...overrides });
function session(sessionId, overrides = {}) {
  return { sessionId, synthesisVersion: 'v1', verificationStatus: 'UNVERIFIED',
    evidence: [{ evidenceId: 'e1', sourceVersionKey: 'source-v1', anchor: { page: 1 } }],
    synthesis: { title: 'Synthetic session', topicBlocks: [topic()], uncertainties: [], conflicts: [],
      coverage: { summary: 'Synthetic text only.' } }, ...overrides };
}
const run = (sessions, previous = null, extra = {}) => consolidate({ course, sessions, previous, ...extra });
const response = (req, extra = {}) => {
  const p = JSON.parse(req.userPrompt);
  return { requestId: req.requestId, groups: [{ canonicalKey: 'sample concept', topicRefs: p.topics.map(t => t.topicRef) }],
    equivalences: [], conflicts: [], inferences: [], ...extra };
};

test('same concept across three sessions merges once and repeated explanations deduplicate', () => {
  const out = run(['s1','s2','s3'].map(s => session(s)));
  assert.equal(out.concepts.length, 1);
  assert.equal(out.concepts[0].details.length, 2);
  for (const d of out.concepts[0].details) assert.equal(d.lineage.length, 3);
  assert.equal(out.coverage.inputDetails, 6);
});

test('later session enriches detail with session/version, evidence version and anchor lineage', () => {
  const old = run([session('s1')]);
  const newer = session('s2'); newer.synthesis.topicBlocks[0].examples.push('A new synthetic example.');
  const out = run([newer], old);
  assert.equal(out.concepts[0].conceptId, old.concepts[0].conceptId);
  const detail = out.concepts[0].details.find(d => d.kind === 'examples');
  assert.equal(detail.lineage[0].sessionId, 's2');
  assert.equal(detail.lineage[0].synthesisVersion, 'v1');
  assert.equal(detail.lineage[0].evidenceRefs[0].sourceVersionKey, 'source-v1');
  assert.deepEqual(detail.lineage[0].evidenceRefs[0].anchor, {page:1});
  assert.equal(out.concepts[0].additionsBySession.length, 2);
  assert.deepEqual(old, run([session('s1')]));
});

test('same session/version reruns and duplicates are byte-for-byte idempotent', () => {
  const s = session('s1'); const out = run([s]);
  assert.deepEqual(run([s,s],out), out);
  assert.deepEqual(run([],out), out);
  assert.equal(JSON.stringify(run([s],out)), JSON.stringify(out));
  assert.equal(createCourseKnowledgeArtifacts(out)[0].content, createCourseKnowledgeArtifacts(run([s],out))[0].content);
});

test('changed content under same immutable session/version fails closed', () => {
  const s = session('s1'); const out = run([s]);
  s.synthesis.topicBlocks[0].explanation = 'Changed';
  assert.throws(() => run([s],out), /immutable/);
});

test('new version preserves old statements and conflicts instead of replacing history', () => {
  const s = session('s1');
  s.synthesis.topicBlocks[0].explanation = { text:'Value is 1.', claimKey:'value', scope:'case A' };
  const old = run([s]);
  s.synthesisVersion = 'v2'; s.synthesis.topicBlocks[0].explanation.text = 'Value is 2.';
  const out = run([s],old);
  assert.equal(out.sessions.length,2);
  assert.equal(out.concepts[0].details.filter(d => d.kind === 'explanation').length,2);
  assert.equal(out.concepts[0].conflicts[0].type,'COMPETING_CLAIMS');
  assert.equal(out.concepts[0].canonicalExplanation.text,'Value is 1.');
});

test('explicit local and global conflicts preserve descriptions and source/session refs', () => {
  const s = session('s1');
  s.synthesis.conflicts = [{subject:'Synthetic conflict',description:'Both alternatives remain.',evidence_refs:['e1']}];
  s.synthesis.topicBlocks[0].conflicts = [{subject:'Local',description:'Unresolved local disagreement',evidence_refs:['e1']}];
  const out = run([s]);
  assert.equal(out.conflicts[0].text,'Both alternatives remain.');
  assert.equal(out.conflicts[0].lineage.sessionId,'s1');
  assert.equal(out.concepts[0].conflicts[0].lineage.evidenceRefs[0].evidenceId,'e1');
  assert.match(renderCourseKnowledgeMarkdown(out),/Both alternatives remain/);
});

test('ASR and global uncertainties cannot be washed out by repeated clean material', () => {
  const s = session('s1'); s.synthesis.topicBlocks[0].uncertainties=['ASR: term is garbled'];
  s.synthesis.uncertainties=[{text:'Audio omitted a qualifier',evidence_refs:['e1']}];
  const out = run([s,session('s2')]);
  const dirty = out.concepts[0].details.find(d => d.uncertainties.length);
  assert.deepEqual(dirty.uncertainties,['ASR: term is garbled','Audio omitted a qualifier']);
  assert.equal(out.uncertainties[0].lineage.sessionId,'s1');
  assert.match(renderCourseKnowledgeMarkdown(out),/ASR: term is garbled/);
  assert.equal(out.verificationStatus,'UNVERIFIED');
});

test('inference and source-linked details remain separate even when text is identical', () => {
  const s = session('s2'); s.synthesis.topicBlocks[0].explanation={text:'A synthetic explanation.',origin:'INFERENCE'};
  const out=run([session('s1'),s]);
  const explanations=out.concepts[0].details.filter(d=>d.kind==='explanation');
  assert.equal(explanations.length,2);
  assert.deepEqual(explanations.map(d=>d.origin).sort(),['INFERENCE','SOURCE_LINKED']);
  assert.equal(out.automaticallyPromotable,false);
});

test('session-only refs are retained without inventing evidence or verification', () => {
  const s=session('s1');s.evidence=[];s.synthesis.topicBlocks[0].evidenceRefs=[];
  const out=run([s]);
  assert.equal(out.concepts[0].details[0].origin,'SESSION_REPORTED');
  assert.deepEqual(out.concepts[0].details[0].lineage[0].evidenceRefs,[]);
});

test('different evidence IDs in different sessions never collide', () => {
  const s=session('s2');s.evidence[0].sourceVersionKey='other-source';
  const out=run([session('s1'),s]);
  const refs=out.concepts[0].details[0].lineage.flatMap(l=>l.evidenceRefs);
  assert.equal(refs.length,2);assert.equal(new Set(refs.map(r=>r.sessionId)).size,2);
});

test('unknown evidence refs and partial publications fail closed', () => {
  const s=session('s1');s.synthesis.topicBlocks[0].evidenceRefs=['missing'];
  assert.throws(()=>run([s]),/outside/);
  assert.throws(()=>run([session('s2',{publicationStatus:'PARTIAL'})]),/partial/);
});

test('input permutations have stable IDs/order, incremental additions preserve existing order', () => {
  const a=session('s1');a.synthesis.topicBlocks[0].title='Zeta';
  const b=session('s2');b.synthesis.topicBlocks[0].title='Alpha';
  assert.deepEqual(run([a,b]),run([b,a]));
  const old=run([a]);const out=run([b],old);
  assert.equal(out.concepts[0].conceptId,old.concepts[0].conceptId);
  assert.deepEqual(out.concepts.map(c=>c.title),['Zeta','Alpha']);
  assert.deepEqual(run([a,b],out),out);
});

test('formula case and signs remain distinct', () => {
  const s=session('s1');s.synthesis.topicBlocks[0].formulas=['A = H','a = h','A = -H'];
  assert.equal(run([s]).concepts[0].formulas.length,3);
});

test('generated course output descriptors self-exclude from the existing session compiler', () => {
  const out=run([session('s1')]); const artifacts=createCourseKnowledgeArtifacts(out);
  assert.equal(artifacts[0].name,'COURSE_KNOWLEDGE.md');
  assert.deepEqual(JSON.parse(artifacts[1].content),out);
  const selected=selectCompilationEvidence({artifacts});
  assert.equal(selected.evidence.length,0);assert.equal(selected.exclusions.length,2);
  for(const artifact of [...artifacts,out,{path:'nested/COURSE_KNOWLEDGE.json'}]) {
    assert.equal(isCourseKnowledgeArtifact(artifact),true);
    assert.throws(()=>run([artifact]),/generated course/);
  }
});

test('snake_case compiler response works inside explicit versioned envelope', () => {
  const s={contextId:'s1',synthesisVersion:'hash-v1',synthesis:{title:'Synthetic',topic_blocks:[{
    title:'Sample concept',explanation:'Synthetic explanation',evidence_refs:['ref'],lecturer_emphasis:['Recall this'],
  }],uncertainties:[],conflicts:[]}};
  const out=run([s]);assert.equal(out.concepts[0].lecturerEmphasis.length,1);
  assert.equal(out.sessions[0].data.sessionId,'s1');
});

test('legacy topics-only enrichment is rejected rather than silently losing its content', () => {
  assert.throws(()=>run([{contextId:'s1',synthesisVersion:'v1',synthesis:{topics:[{}]}}]),/topicBlocks/);
  assert.throws(()=>run([{contextId:'s1',synthesis:{topicBlocks:[topic()]}}]),/synthesisVersion/);
});

test('semantic request is bounded, deterministic and contains no raw evidence bodies', () => {
  const s=session('s1');s.evidence[0].content='RAW BODY MUST NOT BE SENT';
  const req=request({course,sessions:[s]});
  assert.equal(req.requestId,request({course,sessions:[s]}).requestId);
  assert.ok(!req.userPrompt.includes('RAW BODY MUST NOT BE SENT'));
  assert.throws(()=>request({course,sessions:[s],maxChars:200}),/exceeds/);
  assert.throws(()=>request({course,sessions:[s],maxChars:NaN}),/maxChars/);
  assert.equal(req.coverage.exclusions.length,0);
});

test('semantic grouping merges aliases and semantic duplicate wording with lineage', () => {
  const a=session('s1');const b=session('s2');b.synthesis.topicBlocks[0].title='Alternative label';
  b.synthesis.topicBlocks[0].explanation='An equivalent synthetic explanation.';
  const req=request({course,sessions:[a,b]});const payload=JSON.parse(req.userPrompt);
  const refs=payload.details.filter(d=>d.kind==='explanation').map(d=>d.detailRef);
  const out=run([a,b],null,{reconciliation:response(req,{equivalences:[{detailRefs:refs}]})});
  assert.equal(out.concepts.length,1);
  const explanation=out.concepts[0].details.find(d=>d.kind==='explanation');
  assert.equal(explanation.variants.length,2);assert.equal(explanation.lineage.length,2);
  assert.equal(out.coverage.semanticReconciliation,true);
  assert.deepEqual(run([],out),out);
  const c=session('s3');c.synthesis.topicBlocks[0].title='Alternative label';
  assert.equal(run([c],out).concepts.length,1);
});

test('semantic conflict and cross-session inference are explicit and never verified', () => {
  const a=session('s1');const b=session('s2');b.synthesis.topicBlocks[0].explanation='Conflicting synthetic explanation.';
  const req=request({course,sessions:[a,b]});const payload=JSON.parse(req.userPrompt);
  const refs=payload.details.filter(d=>d.kind==='explanation').map(d=>d.detailRef);
  const out=run([a,b],null,{reconciliation:response(req,{
    conflicts:[{detailRefs:refs,description:'The two alternatives disagree.'}],
    inferences:[{topicRefs:payload.topics.map(t=>t.topicRef),text:'A possible connection.'}],
  })});
  assert.equal(out.conflicts[0].origin,'INFERENCE');assert.equal(out.conflicts[0].lineage.length,2);
  assert.equal(out.concepts[0].conflicts.length,1);
  assert.equal(out.inferences[0].origin,'INFERENCE');
  assert.match(renderCourseKnowledgeMarkdown(out),/The two alternatives disagree/);
});

test('semantic validation rejects stale request, invented refs, omissions and duplicates', () => {
  const sessions=[session('s1'),session('s2')];const req=request({course,sessions});
  for(const bad of [
    {...response(req),requestId:'invented'},
    response(req,{groups:[{canonicalKey:'x',topicRefs:['invented']}]}),
    response(req,{groups:[]}),
    response(req,{groups:[...response(req).groups,...response(req).groups]}),
    response(req,{inferences:[{topicRefs:['invented'],text:'Not sourced'}]}),
    response(req,{conflicts:[{detailRefs:['invented','invented2'],description:'Not sourced'}]}),
  ]) assert.throws(()=>run(sessions,null,{reconciliation:bad}));
});

test('semantic dedup cannot hide uncertainty or erase a conflict', () => {
  const a=session('s1'),b=session('s2');b.synthesis.topicBlocks[0].uncertainties=['ASR questionable'];
  let req=request({course,sessions:[a,b]});
  let refs=JSON.parse(req.userPrompt).details.filter(d=>d.kind==='explanation').map(d=>d.detailRef);
  assert.throws(()=>run([a,b],null,{reconciliation:response(req,{equivalences:[{detailRefs:refs}]})}),/unsafe/);
  b.synthesis.topicBlocks[0].uncertainties=[];b.synthesis.topicBlocks[0].explanation='Different.';
  req=request({course,sessions:[a,b]});refs=JSON.parse(req.userPrompt).details.filter(d=>d.kind==='explanation').map(d=>d.detailRef);
  assert.throws(()=>run([a,b],null,{reconciliation:response(req,{equivalences:[{detailRefs:refs}],
    conflicts:[{detailRefs:refs,description:'Disagrees'}]})}),/conflicting details/);
});

test('merging existing concepts preserves surviving ID and redirects old ID', () => {
  const a=session('s1'),b=session('s2');b.synthesis.topicBlocks[0].title='Other';
  const old=run([a,b]);const req=request({course,sessions:[],previous:old});
  const out=run([],old,{reconciliation:response(req)});
  assert.equal(out.concepts[0].conceptId,old.concepts[0].conceptId);
  assert.equal(out.conceptRedirects[old.concepts[1].conceptId],old.concepts[0].conceptId);
  assert.deepEqual(run([],out),out);
});

test('cannot split an established concept through semantic response', () => {
  const sessions=[session('s1'),session('s2')];const req=request({course,sessions});
  const p=JSON.parse(req.userPrompt);
  assert.throws(()=>run(sessions,null,{reconciliation:response(req,{groups:p.topics.map((t,i)=>({canonicalKey:`k${i}`,topicRefs:[t.topicRef]}))})}),/split/);
});

test('cross-course previous state and corrupted previous session fail closed', () => {
  const old=run([session('s1')]);
  assert.throws(()=>consolidate({course:{courseId:'other',title:'Other'},previous:old}),/mismatch/);
  old.sessions[0].data.topicBlocks[0].title='tampered';
  assert.throws(()=>run([],old),/digest/);
});

test('topic-level inference classification propagates to every retained detail', () => {
  const s=session('s1');s.synthesis.topicBlocks[0].origin='INFERENCE';
  assert.ok(run([s]).concepts[0].details.every(d=>d.origin==='INFERENCE'));
});

test('previous decisions and canonical projections are integrity checked', () => {
  const old=run([session('s1')]);old.concepts[0].canonicalExplanation.text='Forged';
  assert.throws(()=>run([],old),/revision digest/);
});

test('semantic response cannot expand unboundedly', () => {
  const sessions=[session('s1')];const req=request({course,sessions,maxChars:10000});
  const p=JSON.parse(req.userPrompt);
  assert.throws(()=>run(sessions,null,{maxChars:10000,reconciliation:response(req,{
    inferences:[{text:'x'.repeat(10001),topicRefs:p.topics.map(t=>t.topicRef)}],
  })}),/bounded/);
});

test('semantic equivalence cannot hide different explicitly keyed claims', () => {
  const a=session('s1'),b=session('s2');
  a.synthesis.topicBlocks[0].explanation={text:'The value is 1.',claimKey:'value'};
  b.synthesis.topicBlocks[0].explanation={text:'The value is 2.',claimKey:'value'};
  const req=request({course,sessions:[a,b]});
  const detailRefs=JSON.parse(req.userPrompt).details.filter(d=>d.kind==='explanation').map(d=>d.detailRef);
  assert.throws(()=>run([a,b],null,{reconciliation:response(req,{equivalences:[{detailRefs}]})}),/competing/);
});

test('synthesis and runtime coverage both survive without one replacing the other', () => {
  const s=session('s1',{coverage:{selectedChars:123},exclusions:['synthetic excluded artifact']});
  const out=run([s]);
  assert.deepEqual(out.coverage.sourceCoverage[0].runtimeCoverage,{selectedChars:123});
  assert.equal(out.coverage.sourceCoverage[0].coverage.summary,'Synthetic text only.');
  assert.equal(out.coverage.sourceCoverage[0].exclusions[0],'synthetic excluded artifact');
});

test('current runtime companion adapter supplies stable content version and selective verdict lineage', async () => {
  const {sessionSynthesisToCourseInput:adapt}=await import('../packages/knowledge/src/cross-session.mjs');
  const {sessionId,...base}=session('s1');delete base.synthesisVersion;
  const companion={...base,contextId:sessionId,artifactType:'session_synthesis',schemaVersion:'0.2',
    publicationStatus:'COMPLETE',generatedAt:'2026-01-01',bundleId:'synthetic-bundle',
    verificationStatus:'VERIFIED_WITH_QUALIFICATION',verificationRuntimeStatus:'COMPLETE',
    verification:{verdicts:[{topicIndex:0,verdict:'VERIFIED_WITH_QUALIFICATION',
      qualifications:['Only within the synthetic scope'],checkedEvidenceRefs:['e1']}],warnings:[]}};
  const input=adapt(companion);
  assert.match(input.synthesisVersion,/^session-synthesis:/);
  const out=run([input]);
  assert.ok(out.concepts[0].details[0].uncertainties.includes('Only within the synthetic scope'));
  assert.equal(out.concepts[0].details[0].lineage[0].verification[0].verdict,'VERIFIED_WITH_QUALIFICATION');
  companion.generatedAt='2026-02-02';companion.timings={totalMs:999};
  assert.equal(adapt(companion).synthesisVersion,input.synthesisVersion);
  assert.deepEqual(run([adapt(companion)],out),out);
  companion.synthesis.topicBlocks[0].explanation='A changed synthetic result from the same bundle.';
  assert.notEqual(adapt(companion).synthesisVersion,input.synthesisVersion);
  assert.equal(run([adapt(companion)],out).sessions.length,2);
  companion.publicationStatus='PARTIAL';assert.throws(()=>adapt(companion),/complete/);
});

test('mutating input anchor metadata cannot retroactively alter a course snapshot', () => {
  const s=session('s1');const out=run([s]);const saved=JSON.stringify(out);
  s.evidence[0].anchor.page=99;
  assert.equal(JSON.stringify(out),saved);
  assert.deepEqual(run([],out),out);
});
