import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(
  'apps/apps-script-runtime/src/modules/60_providers/60_tubs_ki_toolbox_runtime.gs',
  'utf8'
);

function runtime() {
  const context = vm.createContext({
    console
  });
  vm.runInContext(source, context);
  return context;
}

test('TU parser extracts the final done response from NDJSON', () => {
  const ctx = runtime();
  const parsed = ctx.careerOsTuKiToolboxParseResponse_(
    '{"type":"chunk","response":"partial"}\n' +
    '{"type":"done","response":"final answer"}\n'
  );
  assert.equal(parsed.text, 'final answer');
});

test('TU provider privacy gate fails closed', () => {
  const ctx = runtime();
  assert.throws(
    () => ctx.careerOsTuKiToolboxAssertRequest_({
      model: 'Qwen/Qwen3.8-27B',
      prompt: 'technical text',
      privacyApproved: false,
      privacyClass: 'academic_non_personal'
    }),
    /privacy gate/
  );
});

test('TU provider accepts only explicitly approved models', () => {
  const ctx = runtime();
  assert.throws(
    () => ctx.careerOsTuKiToolboxAssertRequest_({
      model: 'unknown-model',
      prompt: 'technical text',
      privacyApproved: true,
      privacyClass: 'academic_non_personal'
    }),
    /model is not approved/
  );

  const request = ctx.careerOsTuKiToolboxAssertRequest_({
    model: 'openai/gpt-oss-120b',
    prompt: 'technical text',
    privacyApproved: true,
    privacyClass: 'academic_non_personal'
  });
  assert.equal(request.model, 'openai/gpt-oss-120b');
});

test('TU provider only exposes rate/retry-related response headers', () => {
  const ctx = runtime();
  const headers = ctx.careerOsTuKiToolboxRateHeaders_({
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': '42',
    'Retry-After': '10',
    'Server': 'example'
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(headers)),
    {
      'X-RateLimit-Remaining': '42',
      'Retry-After': '10'
    }
  );
});
