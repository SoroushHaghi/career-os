import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function dashboard() {
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '', className: '' });
      return elements.get(id);
    },
    addEventListener() {},
  };
  const context = vm.createContext({
    document,
    window: {},
    localStorage: { getItem: () => null, setItem() {} },
    setInterval() {},
  });
  vm.runInContext(readFileSync('apps/apps-script-runtime/src/modules/97_private_dashboard.gs', 'utf8'), context);
  const html = context.careerOsPrivateDashboardHtml_();
  vm.runInContext(html.split('<script>')[1].split('</script>')[0], context);
  return { context, element: id => elements.get(id)?.innerHTML || '' };
}

function snapshot(updatedAt, engineeringStale = false) {
  return {
    serverTimeUtc: new Date().toISOString(),
    assistant: {
      status: 'RUNNING', focus: 'Old dashboard deployment', currentStep: 'Deploying',
      sourceModifiedUtc: updatedAt, running: ['Deploying'], pending: [], recent: [],
    },
    taskLedger: { tasks: [] },
    engineering: {
      stale: engineeringStale,
      runs: [{ name: 'Deploy workflow', status: 'in_progress', updatedAt }],
    },
    runtime: { lanes: {} }, queues: {}, providers: {}, pipeline: {},
  };
}

test('an old assistant report and fallback GitHub run are not claimed as running now', () => {
  const { context, element } = dashboard();
  const old = new Date(Date.now() - 15 * 60_000).toISOString();
  context.render(snapshot(old, true), true);
  assert.doesNotMatch(element('runningNow'), /Old dashboard deployment|Deploy workflow/);
  assert.match(element('assistantTask'), /LAST SEEN RUNNING/);
  assert.match(element('recentProgress'), /Old dashboard deployment/);
  context.render(snapshot(old, true), false);
  assert.doesNotMatch(element('runningNow'), /Old dashboard deployment|Deploy workflow/);
  assert.match(element('engineering'), /LAST SEEN IN_PROGRESS/);
});

test('a fresh assistant report can appear as running, while an offline cache cannot', () => {
  const { context, element } = dashboard();
  const recent = new Date(Date.now() - 60_000).toISOString();
  context.render(snapshot(recent), true);
  assert.match(element('runningNow'), /Old dashboard deployment/);
  context.render(snapshot(recent), false);
  assert.doesNotMatch(element('runningNow'), /Old dashboard deployment/);
  assert.match(element('recentProgress'), /LAST_SEEN_RUNNING/);
});
