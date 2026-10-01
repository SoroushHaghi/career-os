import { createHash } from 'node:crypto';

function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

export function sourceKey(sourceSystem, sourceId) {
  return `${requireText(sourceSystem, 'sourceSystem')}:${requireText(sourceId, 'sourceId')}`;
}

export function sourceVersionKey(sourceKeyValue, versionId) {
  return `${requireText(sourceKeyValue, 'sourceKey')}@${requireText(versionId, 'versionId')}`;
}

export function externalContextId(sourceSystem, containerId, kind = 'container') {
  return `${requireText(sourceSystem, 'sourceSystem')}-${requireText(kind, 'kind')}:${requireText(containerId, 'containerId')}`;
}

export function deterministicId(namespace, ...parts) {
  requireText(namespace, 'namespace');
  const canonical = parts.map((p, i) => requireText(String(p), `part${i}`)).join('\u001f');
  const digest = createHash('sha256').update(`${namespace}\u001e${canonical}`, 'utf8').digest('hex');
  return `${namespace}:${digest}`;
}

export function evidenceId({ sourceVersionKey: svk, processorVersion, anchor }) {
  return deterministicId('evidence', svk, processorVersion, canonicalAnchor(anchor));
}

export function canonicalAnchor(anchor) {
  if (anchor == null || typeof anchor !== 'object' || Array.isArray(anchor)) {
    throw new TypeError('anchor must be an object');
  }
  const ordered = Object.keys(anchor).sort().reduce((acc, key) => {
    acc[key] = anchor[key];
    return acc;
  }, {});
  return JSON.stringify(ordered);
}
