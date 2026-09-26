import { createSource, createSourceVersion } from '../../core/src/contracts.mjs';

function sourceTypeFromMime(mimeType = '', name = '') {
  const mime = String(mimeType).toLowerCase();
  const lower = String(name).toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.includes('presentation')) return 'presentation';
  if (mime.startsWith('text/')) return 'text';
  if (mime.includes('document') || mime.includes('wordprocessingml')) return 'document';
  if (/\.(txt|md|json|csv|ya?ml)$/i.test(lower)) return 'text';
  return 'binary';
}

export function driveVersionIdentity(metadata = {}) {
  const mime = String(metadata.mimeType ?? '').toLowerCase();

  if (metadata.md5Checksum) {
    return {
      versionId: `md5:${String(metadata.md5Checksum).toLowerCase()}`,
      fingerprintType: 'md5',
      fingerprintValue: String(metadata.md5Checksum).toLowerCase(),
    };
  }
  if (metadata.sha256Checksum) {
    return {
      versionId: `sha256:${String(metadata.sha256Checksum).toLowerCase()}`,
      fingerprintType: 'sha256',
      fingerprintValue: String(metadata.sha256Checksum).toLowerCase(),
    };
  }
  if (metadata.sha1Checksum) {
    return {
      versionId: `sha1:${String(metadata.sha1Checksum).toLowerCase()}`,
      fingerprintType: 'sha1',
      fingerprintValue: String(metadata.sha1Checksum).toLowerCase(),
    };
  }
  if (mime === 'application/vnd.google-apps.folder' && metadata.id) {
    return {
      versionId: `folder-id:${metadata.id}`,
      fingerprintType: 'folder_id',
      fingerprintValue: String(metadata.id),
    };
  }
  if (metadata.headRevisionId) {
    return {
      versionId: `revision:${metadata.headRevisionId}`,
      fingerprintType: 'drive_revision',
      fingerprintValue: String(metadata.headRevisionId),
    };
  }
  if (metadata.etag) {
    return {
      versionId: `etag:${metadata.etag}`,
      fingerprintType: 'etag',
      fingerprintValue: String(metadata.etag),
    };
  }
  if (mime.startsWith('application/vnd.google-apps.')) {
    const modified = String(metadata.modifiedTime ?? 'unknown');
    return {
      versionId: `native-modified:${modified}`,
      fingerprintType: 'native_modified_time',
      fingerprintValue: modified,
    };
  }

  const size = String(metadata.size ?? '');
  const modified = String(metadata.modifiedTime ?? 'unknown');
  const fallback = `${size}:${modified}`;

  return {
    versionId: `fallback:${fallback}`,
    fingerprintType: 'size_modified_fallback',
    fingerprintValue: fallback,
  };
}

export function normalizeDriveFile(metadata, { observedAt, parentLabels = {} } = {}) {
  if (!metadata?.id) throw new TypeError('Drive metadata.id is required');
  if (!observedAt) throw new TypeError('observedAt is required');

  const source = createSource({
    sourceSystem: 'drive',
    sourceId: metadata.id,
    sourceType: sourceTypeFromMime(metadata.mimeType, metadata.name),
    name: metadata.name || 'unnamed',
    mimeType: metadata.mimeType || null,
    contentLocator: `drive-file:${metadata.id}`,
    accountOrScope: 'google_drive',
    createdAt: metadata.createdTime || null,
    modifiedAt: metadata.modifiedTime || null,
    metadata: {
      trashed: Boolean(metadata.trashed),
      generatedByCareerOs: metadata.appProperties?.careerOsGenerated === 'true',
    },
  });

  const versionIdentity = driveVersionIdentity(metadata);
  const sourceVersion = createSourceVersion({
    sourceKey: source.sourceKey,
    ...versionIdentity,
    observedAt,
    size: metadata.size == null ? null : Number(metadata.size),
    modifiedAt: metadata.modifiedTime || null,
  });

  const contextHints = (metadata.parents ?? []).map((parentId) => ({
    contextId: `drive-folder:${parentId}`,
    label: parentLabels[parentId] ?? '',
    method: 'drive_parent',
    confidence: parentLabels[parentId] ? 0.6 : 0.3,
    nativeContainerId: String(parentId),
  }));

  return { source, sourceVersion, contextHints };
}

export function shouldIgnoreAsGenerated(metadata = {}) {
  return metadata.appProperties?.careerOsGenerated === 'true';
}
