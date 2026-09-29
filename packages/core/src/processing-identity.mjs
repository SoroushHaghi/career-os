// Shared pure contract, also embedded verbatim (without exports) in Apps Script.
export function processingIdentity(input) {
  const result = {};
  ['sourceVersionKey', 'processorName', 'processorVersion', 'processingProfileVersion'].forEach(function(key) {
    const value = input && input[key];
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(key + ' is required');
    result[key] = value.trim();
  });
  return result;
}

export function processingIdentityKey(input) {
  const value = processingIdentity(input);
  return JSON.stringify([value.sourceVersionKey, value.processorName,
    value.processorVersion, value.processingProfileVersion]);
}

export function sameProcessingIdentity(left, right) {
  try { return processingIdentityKey(left) === processingIdentityKey(right); }
  catch (_error) { return false; } // Unversioned artifacts are stale, not upgraded by guessing.
}
