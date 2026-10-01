import test from 'node:test';
import assert from 'node:assert/strict';
import { generatedArtifactReuseDecision } from '../packages/processing/src/artifact-reuse.mjs';
const identity = {sourceVersionKey: '["F1","HASH_A"]', processorName: 'pdf_text_extraction', processorVersion: '1', processingProfileVersion: '1'};
const props = {careerOsGenerated: 'true', careerOsSourceId: 'F1', careerOsSourceFingerprint: 'HASH_A', careerOsProcessorName: 'pdf_text_extraction', careerOsProcessorVersion: '1', careerOsProcessingProfileVersion: '1'};
function decision(p = props, expectedIdentity = identity) {
  return generatedArtifactReuseDecision({sourceId: 'F1', expectedIdentity, sourceModifiedTime: 'same', candidate: {appProperties: p}});
}
test('complete processing identity reuses artifact', () => assert.equal(decision().reusable, true));
test('legacy timestamp cannot authorize unversioned processor output', () => assert.equal(decision({careerOsGenerated:'true',careerOsSourceId:'F1',careerOsSourceModifiedTime:'same'}).reusable, false));
test('source version mismatch cannot fall back to matching modifiedTime', () => assert.equal(decision({...props,careerOsSourceFingerprint:'HASH_B',careerOsSourceModifiedTime:'same'}).reusable, false));
for (const key of ['processorName','processorVersion','processingProfileVersion']) {
  test(key + ' mismatch invalidates only that identity', () => assert.equal(decision(props,{...identity,[key]:'new'}).reusable,false));
}
