import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {processingIdentityKey, sameProcessingIdentity} from '../packages/core/src/processing-identity.mjs';
import {planProcessing, processingIdempotencyKey} from '../packages/processing/src/planner.mjs';
import {jobKey, enqueueUnique} from '../packages/processing/src/queue.mjs';
const root='apps/apps-script-runtime/src/modules/';
function runtime(extra={}) {
  const ctx=vm.createContext({console,...extra});
  vm.runInContext(readFileSync('packages/core/src/processing-identity.mjs','utf8').replace(/^export /gm,''),ctx);
  for(const path of ['00_config/20_processing_identity.gs','70_persistence/10_artifact_reuse.gs','50_processors/20_image_processor.gs','50_processors/15_transcript_match_runtime.gs','70_persistence/20_sidecar_write.gs']) vm.runInContext(readFileSync(root+path,'utf8'),ctx);
  return ctx;
}
const iterable=items=>({getFiles:()=>{let i=0;return {hasNext:()=>i<items.length,next:()=>items[i++]};}});
for(const [kind,mime] of [['image','image/heif'],['pdf','application/pdf'],['audio','audio/mpeg']]) {
  test(kind+': unchanged reuse; source/processor/profile invalidation; unrelated upgrade isolation',()=>{
    let props;
    const ctx=runtime({getDriveFileMetadataSafe_:()=>({appProperties:props})});
    const source={getId:()=> 'S',getMimeType:()=>mime};
    const folder=iterable([{getId:()=> 'A'}]);
    const id=ctx.careerOsProcessingIdentity_('S','v1',kind);
    props={careerOsGenerated:'true',careerOsSourceId:'S',careerOsSourceFingerprint:'v1',...ctx.careerOsProcessingProperties_(id)};
    const check=(fp='v1')=>ctx.hasCurrentGeneratedArtifactForSource_(source,folder,fp,'same-time');
    assert.equal(check(),true);
    assert.equal(check('v2'),false);
    vm.runInContext(`CAREER_OS_PROCESSORS.${kind}.processorVersion='2'`,ctx);
    assert.equal(check(),false);
    vm.runInContext(`CAREER_OS_PROCESSORS.${kind}.processorVersion='1'; CAREER_OS_PROCESSORS.${kind}.processingProfileVersion='2'`,ctx);
    assert.equal(check(),false);
    vm.runInContext(`CAREER_OS_PROCESSORS.${kind}.processingProfileVersion='1'; CAREER_OS_PROCESSORS.${kind==='image'?'audio':'image'}.processorVersion='99'`,ctx);
    assert.equal(check(),true);
    delete props.careerOsProcessorVersion;
    assert.equal(check(),false);
  });
}
test('runtime and package queue keys use the exact same four-part contract',()=>{
  const ctx=runtime();const id=ctx.careerOsProcessingIdentity_('S','v1','audio');
  assert.equal(ctx.processingIdentityKey(id),processingIdentityKey(id));
  assert.equal(jobKey(id),processingIdempotencyKey(id));
  assert.equal(sameProcessingIdentity(id,{...id,processorName:'verify'}),false);
});
test('processor upgrade resets old audio partial/retry state; unchanged job retains progress',()=>{
  let cleanup=0;
  const ctx=runtime({deleteGeminiUploadedFile_:()=>cleanup++,cleanupGroqChunkPartial_:()=>cleanup++,careerOsGetAudioTranscriptionProvider_:()=> 'groq'});
  const id=ctx.careerOsProcessingIdentity_('S','v1','audio');
  const job={fileId:'S',sourceFingerprint:'v1',processingIdentity:id,attempts:5,nextAttemptAt:999,groqChunkIndex:4};
  assert.equal(ctx.careerOsRefreshProcessingJob_(job,'audio'),false);
  assert.equal(job.groqChunkIndex,4);assert.equal(cleanup,0);
  vm.runInContext("CAREER_OS_PROCESSORS.audio.processingProfileVersion='2'",ctx);
  assert.equal(ctx.careerOsRefreshProcessingJob_(job,'audio'),true);
  assert.equal(job.groqChunkIndex,0);assert.equal(job.attempts,0);assert.equal(job.nextAttemptAt,0);assert.equal(cleanup,2);
  assert.equal(job.jobKey,processingIdentityKey(job.processingIdentity));
});
test('generated stale audio cannot masquerade as a manual same-name transcript',()=>{
  const source={getId:()=> 'S',getName:()=> 'lecture.m4a'};
  const candidate={getId:()=> 'A',getName:()=> 'lecture.txt',getBlob:()=>({getDataAsString:()=> 'A long manually looking transcript'})};
  const ctx=runtime({getDriveFileMetadataSafe_:id=>({appProperties:id==='A'?{careerOsGenerated:'true',careerOsSourceId:'S',careerOsSourceFingerprint:'v1'}:{}}),buildSourceFingerprintFromMetadata_:()=> 'v1'});
  assert.equal(ctx.findConfirmedTranscriptForAudio_(source,iterable([candidate]),'v1'),null);
});
test('planner distinguishes processor/profile even when artifact type and source match',()=>{
  const identity={sourceVersionKey:'S@v1',processorName:'audio_transcribe',processorVersion:'1',processingProfileVersion:'1'};
  const run=(artifact, profiles={})=>planProcessing({source:{sourceType:'audio'},sourceVersion:{sourceVersionKey:'S@v1'},authorization:{authorizationState:'AUTHORIZED'},existingArtifacts:[{...artifact,artifactType:'TRANSCRIPT',state:'AVAILABLE'}],processingProfileVersions:profiles}).jobs[0];
  assert.equal(run(identity).outcome,'SKIPPED_CURRENT');
  assert.equal(run({...identity,processorName:'other'}).outcome,'PLANNED');
  assert.equal(run(identity,{audio_transcribe:'2'}).outcome,'PLANNED');
  assert.equal(run(identity,{image_extract:'2'}).outcome,'SKIPPED_CURRENT');
});

test('queue ignores stale caller keys when a processor identity changes',()=>{
  const job={sourceVersionKey:'S@v1',processorName:'audio_transcribe',processorVersion:'1',processingProfileVersion:'1'};
  const first=enqueueUnique([],job);
  const upgraded=enqueueUnique(first.queue,{...job,processorVersion:'2',jobKey:first.jobKey});
  assert.equal(upgraded.added,true);
  assert.notEqual(upgraded.jobKey,first.jobKey);
});
test('portable metadata round-trips the complete identity',()=>{
  const ctx=runtime();
  const identity=ctx.careerOsProcessingIdentity_('S','v1','pdf');
  const header=ctx.careerOsProcessingHeader_(identity);
  assert.equal(sameProcessingIdentity(identity,ctx.careerOsReadProcessingHeader_(header+'\n=== END CAREER OS ARTIFACT METADATA ===\nbody')),true);
  assert.equal(ctx.careerOsReadProcessingHeader_('legacy text'),null);
});
