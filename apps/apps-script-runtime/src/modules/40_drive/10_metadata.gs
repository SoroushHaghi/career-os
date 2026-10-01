// Extracted Drive metadata/source-version compatibility functions.

function buildSourceFingerprintFromMetadata_(
  metadata
) {
  const meta = metadata || {};

  const md5 =
    String(meta.md5Checksum || '')
      .trim()
      .toLowerCase();

  if (md5) {
    return 'md5:' + md5;
  }

  const sha256 =
    String(meta.sha256Checksum || '')
      .trim()
      .toLowerCase();

  if (sha256) {
    return 'sha256:' + sha256;
  }

  const sha1 =
    String(meta.sha1Checksum || '')
      .trim()
      .toLowerCase();

  if (sha1) {
    return 'sha1:' + sha1;
  }

  const mime =
    String(meta.mimeType || '')
      .toLowerCase();

  // Folders have stable identity but no content checksum.
  if (
    mime ===
    'application/vnd.google-apps.folder'
  ) {
    return 'folder-id:' +
      String(meta.id || '');
  }

  // Native Google Docs/Sheets/Slides do not expose md5Checksum.
  // They are not deeply extracted yet; until that adapter is added,
  // modifiedTime remains only a fallback for those native resources.
  if (
    mime.indexOf(
      'application/vnd.google-apps.'
    ) === 0
  ) {
    return (
      'native-modified:' +
      String(meta.modifiedTime || '')
    );
  }

  // Stored binary files normally have MD5. If Drive does not expose one,
  // fall back conservatively rather than loading a large file into memory.
  return (
    'fallback:' +
    String(meta.size || '') +
    ':' +
    String(meta.modifiedTime || '')
  );
}

function getSourceFingerprintFromFileMeta_(
  fileMeta
) {
  const meta = fileMeta || {};

  if (
    meta.md5Checksum ||
    meta.sha1Checksum ||
    meta.sha256Checksum ||
    meta.mimeType ===
      'application/vnd.google-apps.folder'
  ) {
    return buildSourceFingerprintFromMetadata_(
      meta
    );
  }

  if (meta.id) {
    const fresh =
      getDriveFileMetadataSafe_(
        meta.id
      );

    return buildSourceFingerprintFromMetadata_(
      fresh
    );
  }

  return buildSourceFingerprintFromMetadata_(
    meta
  );
}

function getSourceFingerprintById_(
  fileId
) {
  const metadata =
    getDriveFileMetadataSafe_(
      fileId
    );

  return buildSourceFingerprintFromMetadata_(
    metadata
  );
}

function shortFingerprint_(
  value
) {
  const text =
    String(value || '');

  if (text.length <= 28) {
    return text;
  }

  return (
    text.substring(0, 12) +
    '…' +
    text.substring(
      text.length - 12
    )
  );
}

function updateAppPropertiesIfChanged_(
  fileId,
  desiredProperties,
  warningPrefix
) {
  try {
    const metadata =
      Drive.Files.get(
        fileId,
        {
          fields:
            'id,appProperties'
        }
      );

    const existing =
      metadata.appProperties || {};

    const desired =
      desiredProperties || {};

    let changed = false;

    Object.keys(desired)
      .forEach(key => {
        const nextValue =
          String(
            desired[key] === undefined ||
            desired[key] === null
              ? ''
              : desired[key]
          );

        if (
          String(existing[key] || '') !==
          nextValue
        ) {
          changed = true;
        }
      });

    if (!changed) {
      return false;
    }

    const merged = {};

    Object.keys(existing)
      .forEach(key => {
        merged[key] =
          String(existing[key]);
      });

    Object.keys(desired)
      .forEach(key => {
        merged[key] =
          String(
            desired[key] === undefined ||
            desired[key] === null
              ? ''
              : desired[key]
          );
      });

    Drive.Files.update(
      {
        appProperties: merged
      },
      fileId
    );

    return true;

  } catch (error) {
    console.log(
      String(
        warningPrefix ||
        'APP_PROPERTY_UPDATE_WARNING'
      ) +
      ': ' +
      String(error)
    );

    return false;
  }
}
