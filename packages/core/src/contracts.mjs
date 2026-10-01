import { deterministicId, sourceKey, sourceVersionKey } from './identities.mjs';

const TEXT = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
};

const OPTIONAL_TEXT = (value) => value == null || value === '' ? null : String(value).trim();

export const SourceTypes = Object.freeze([
  'audio','video','image','pdf','presentation','document','text','web','binary'
]);

export const ContextKinds = Object.freeze([
  'course','project','module','collection','session','event','reference','unclassified'
]);

export const AuthorizationStates = Object.freeze(['UNKNOWN','AUTHORIZED','RESTRICTED','DENIED']);

export function createSource(input) {
  const sourceSystem = TEXT(input.sourceSystem, 'sourceSystem');
  const sourceId = TEXT(input.sourceId, 'sourceId');
  const sourceType = TEXT(input.sourceType, 'sourceType');
  if (!SourceTypes.includes(sourceType)) throw new TypeError(`unsupported sourceType: ${sourceType}`);
  return Object.freeze({
    sourceKey: sourceKey(sourceSystem, sourceId),
    sourceSystem,
    sourceId,
    sourceType,
    name: TEXT(input.name, 'name'),
    mimeType: OPTIONAL_TEXT(input.mimeType),
    contentLocator: OPTIONAL_TEXT(input.contentLocator),
    accountOrScope: OPTIONAL_TEXT(input.accountOrScope),
    createdAt: OPTIONAL_TEXT(input.createdAt),
    modifiedAt: OPTIONAL_TEXT(input.modifiedAt),
    metadata: input.metadata && typeof input.metadata === 'object' ? Object.freeze({ ...input.metadata }) : Object.freeze({}),
  });
}

export function createSourceVersion(input) {
  const sk = TEXT(input.sourceKey, 'sourceKey');
  const versionId = TEXT(input.versionId, 'versionId');
  return Object.freeze({
    sourceVersionKey: sourceVersionKey(sk, versionId),
    sourceKey: sk,
    versionId,
    fingerprintType: TEXT(input.fingerprintType, 'fingerprintType'),
    fingerprintValue: TEXT(input.fingerprintValue, 'fingerprintValue'),
    observedAt: TEXT(input.observedAt, 'observedAt'),
    size: Number.isFinite(input.size) ? input.size : null,
    modifiedAt: OPTIONAL_TEXT(input.modifiedAt),
  });
}

export function createContext(input) {
  const contextKind = TEXT(input.contextKind, 'contextKind');
  if (!ContextKinds.includes(contextKind)) throw new TypeError(`unsupported contextKind: ${contextKind}`);
  return Object.freeze({
    contextId: TEXT(input.contextId, 'contextId'),
    contextKind,
    label: TEXT(input.label, 'label'),
    parentContextId: OPTIONAL_TEXT(input.parentContextId),
    origin: OPTIONAL_TEXT(input.origin),
    metadata: input.metadata && typeof input.metadata === 'object' ? Object.freeze({ ...input.metadata }) : Object.freeze({}),
  });
}

export function createContextBinding(input) {
  const confidence = input.confidence == null ? 0 : Number(input.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new TypeError('confidence must be between 0 and 1');
  return Object.freeze({
    bindingId: deterministicId('context-binding', TEXT(input.sourceKey, 'sourceKey'), TEXT(input.contextId, 'contextId'), TEXT(input.scope, 'scope')),
    sourceKey: TEXT(input.sourceKey, 'sourceKey'),
    contextId: TEXT(input.contextId, 'contextId'),
    scope: TEXT(input.scope, 'scope'),
    bindingMethod: TEXT(input.bindingMethod, 'bindingMethod'),
    confidence,
    isPrimary: Boolean(input.isPrimary),
  });
}

export function createProcessingAuthorization(input) {
  const state = TEXT(input.authorizationState, 'authorizationState');
  if (!AuthorizationStates.includes(state)) throw new TypeError(`unsupported authorization state: ${state}`);
  const allowed = Array.isArray(input.allowedProcessing) ? [...new Set(input.allowedProcessing.map(String))] : [];
  return Object.freeze({
    authorizationId: deterministicId('authorization', TEXT(input.subjectKey, 'subjectKey'), state, input.privacyClass ?? 'UNSPECIFIED'),
    subjectKey: TEXT(input.subjectKey, 'subjectKey'),
    authorizationState: state,
    privacyClass: TEXT(input.privacyClass ?? 'UNSPECIFIED', 'privacyClass'),
    allowedProcessing: Object.freeze(allowed),
    providerPolicy: input.providerPolicy && typeof input.providerPolicy === 'object' ? Object.freeze({ ...input.providerPolicy }) : null,
    updatedAt: TEXT(input.updatedAt, 'updatedAt'),
    provenance: input.provenance ?? null,
  });
}

export function createArtifact(input) {
  const sourceVersionKeyValue = OPTIONAL_TEXT(input.sourceVersionKey);
  const contextId = OPTIONAL_TEXT(input.contextId);
  const artifactType = TEXT(input.artifactType, 'artifactType');
  const processorName = TEXT(input.processorName, 'processorName');
  const processorVersion = TEXT(input.processorVersion, 'processorVersion');
  const identitySeed = sourceVersionKeyValue ?? contextId ?? TEXT(input.locator, 'locator');
  const artifactId = input.artifactId ?? deterministicId('artifact', identitySeed, artifactType, processorName, processorVersion);
  return Object.freeze({
    artifactId,
    artifactType,
    sourceVersionKey: sourceVersionKeyValue,
    contextId,
    locator: TEXT(input.locator, 'locator'),
    contentType: TEXT(input.contentType, 'contentType'),
    processorName,
    processorVersion,
    createdAt: TEXT(input.createdAt, 'createdAt'),
    provenance: input.provenance ?? null,
  });
}

export function createEvidenceUnit(input) {
  return Object.freeze({
    evidenceId: TEXT(input.evidenceId, 'evidenceId'),
    sourceVersionKey: TEXT(input.sourceVersionKey, 'sourceVersionKey'),
    artifactId: OPTIONAL_TEXT(input.artifactId),
    modality: TEXT(input.modality, 'modality'),
    anchor: Object.freeze({ ...(input.anchor ?? {}) }),
    content: input.content == null ? null : String(input.content),
    extractionMethod: TEXT(input.extractionMethod, 'extractionMethod'),
    processorVersion: TEXT(input.processorVersion, 'processorVersion'),
    qualityFlags: Object.freeze(Array.isArray(input.qualityFlags) ? [...input.qualityFlags] : []),
    contextIds: Object.freeze(Array.isArray(input.contextIds) ? [...new Set(input.contextIds.map(String))] : []),
  });
}

export function createProcessingRecord(input) {
  return Object.freeze({
    processingId: input.processingId ?? deterministicId(
      'processing',
      TEXT(input.sourceVersionKey, 'sourceVersionKey'),
      TEXT(input.processorName, 'processorName'),
      TEXT(input.processorVersion, 'processorVersion'),
      TEXT(input.processingProfileVersion, 'processingProfileVersion')
    ),
    sourceVersionKey: TEXT(input.sourceVersionKey, 'sourceVersionKey'),
    processorName: TEXT(input.processorName, 'processorName'),
    processorVersion: TEXT(input.processorVersion, 'processorVersion'),
    processingProfileVersion: TEXT(input.processingProfileVersion, 'processingProfileVersion'),
    status: TEXT(input.status, 'status'),
    startedAt: OPTIONAL_TEXT(input.startedAt),
    finishedAt: OPTIONAL_TEXT(input.finishedAt),
    attempt: Number.isInteger(input.attempt) && input.attempt >= 0 ? input.attempt : 0,
    provider: OPTIONAL_TEXT(input.provider),
    model: OPTIONAL_TEXT(input.model),
    inputArtifactIds: Object.freeze(Array.isArray(input.inputArtifactIds) ? [...input.inputArtifactIds] : []),
    outputArtifactIds: Object.freeze(Array.isArray(input.outputArtifactIds) ? [...input.outputArtifactIds] : []),
    errorCode: OPTIONAL_TEXT(input.errorCode),
    retryAt: OPTIONAL_TEXT(input.retryAt),
    costOrQuotaClass: OPTIONAL_TEXT(input.costOrQuotaClass),
  });
}
