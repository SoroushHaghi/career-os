function careerOsVnextGetOrCreateChildFolder_(parentFolder, name) {
  const folders = parentFolder.getFoldersByName(String(name));

  if (folders.hasNext()) {
    return folders.next();
  }

  return parentFolder.createFolder(String(name));
}


function careerOsVnextFindOwnedFileByName_(
  folder,
  name,
  contextId
) {
  const files =
    folder.getFilesByName(
      String(name)
    );

  while (files.hasNext()) {
    const file =
      files.next();

    const metadata =
      getDriveFileMetadataSafe_(
        file.getId()
      );

    const props =
      metadata.appProperties || {};

    if (
      props.careerOsGenerated === 'true' &&
      String(
        props.careerOsVnextContextId ||
        ''
      ) ===
        String(contextId || '')
    ) {
      return file;
    }
  }

  return null;
}


function careerOsVnextWriteOwnedText_(
  folder,
  name,
  text,
  contextId,
  artifactType
) {
  let file =
    careerOsVnextFindOwnedFileByName_(
      folder,
      name,
      contextId
    );

  if (file) {
    if (
      String(file.getBlob().getDataAsString()) !==
      String(text)
    ) {
      file.setContent(
        String(text)
      );
    }
  } else {
    const occupied =
      folder.getFilesByName(
        String(name)
      );

    const targetName =
      occupied.hasNext()
        ? 'career-os__' + String(name)
        : String(name);

    file =
      folder.createFile(
        targetName,
        String(text),
        MimeType.PLAIN_TEXT
      );
  }

  updateAppPropertiesIfChanged_(
    file.getId(),
    {
      careerOsGenerated: 'true',
      careerOsVnextContextId:
        String(contextId || ''),
      careerOsVnextArtifactType:
        String(artifactType || ''),
      careerOsVnextSchemaVersion:
        '0.1'
    },
    'VNEXT_REGISTRY_MARK_WARNING'
  );

  return file;
}


function careerOsVnextSourceProcessingStatus_(
  mimeType,
  appProps
) {
  const mime =
    String(mimeType || '')
      .toLowerCase();

  if (
    mime ===
    'application/pdf'
  ) {
    return String(
      appProps.careerOsPdfStatus ||
      ''
    );
  }

  if (
    mime.startsWith(
      'audio/'
    )
  ) {
    return String(
      appProps.careerOsAudioStatus ||
      ''
    );
  }

  if (
    mime.startsWith(
      'image/'
    )
  ) {
    return String(
      appProps.careerOsImageStatus ||
      ''
    );
  }

  return '';
}


function careerOsVnextCollectWorkspaceArtifacts_(
  contextFolder
) {
  const artifacts = [];
  const evidence = [];

  const workspaces =
    contextFolder.getFoldersByName(
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );

  if (!workspaces.hasNext()) {
    return {
      artifacts:
        artifacts,
      evidence:
        evidence
    };
  }

  const workspace =
    workspaces.next();

  const files =
    workspace.getFiles();

  while (files.hasNext()) {
    const file =
      files.next();

    const name =
      String(
        file.getName()
      );

    if (
      name ===
        'CONTEXT_MANIFEST.json' ||
      name ===
        CAREER_OS_CONFIG
          .SESSION_MANIFEST_FILE ||
      name.startsWith(
        CAREER_OS_CONFIG
          .SESSION_STATUS_FILE_PREFIX
      )
    ) {
      continue;
    }

    const metadata =
      getDriveFileMetadataSafe_(
        file.getId()
      );

    const props =
      metadata.appProperties || {};

    const artifactId =
      'drive-artifact:' +
      file.getId();

    const artifactType =
      String(
        props.careerOsVnextArtifactType ||
        props.careerOsEvidenceType ||
        (
          props.careerOsGenerated ===
            'true'
            ? 'GENERATED_TEXT'
            : 'EXTERNAL_TEXT'
        )
      );

    const sourceId =
      String(
        props.careerOsSourceId ||
        ''
      );

    const sourceFingerprint =
      String(
        props.careerOsSourceFingerprint ||
        ''
      );

    artifacts.push({
      artifactId:
        artifactId,
      artifactType:
        artifactType,
      locator:
        'drive-file:' +
        file.getId(),
      name:
        name,
      contentType:
        file.getMimeType(),
      generatedByCareerOs:
        props.careerOsGenerated ===
        'true',
      sourceId:
        sourceId,
      sourceFingerprint:
        sourceFingerprint,
      processingIdentity: careerOsStoredProcessingIdentity_(props),
      state:
        'AVAILABLE',
      modifiedAt:
        metadata.modifiedTime ||
        file.getLastUpdated()
          .toISOString()
    });

    evidence.push({
      evidenceId:
        'drive-evidence:' +
        file.getId(),
      artifactId:
        artifactId,
      sourceId:
        sourceId,
      sourceFingerprint:
        sourceFingerprint,
      processingIdentity: careerOsStoredProcessingIdentity_(props),
      modality:
        'text',
      anchor: {
        kind:
          'whole_file'
      },
      extractionMethod:
        artifactType,
      contextId:
        'drive-folder:' +
        contextFolder.getId()
    });
  }

  artifacts.sort(
    function(a, b) {
      return String(
        a.artifactId
      ).localeCompare(
        String(
          b.artifactId
        )
      );
    }
  );

  evidence.sort(
    function(a, b) {
      return String(
        a.evidenceId
      ).localeCompare(
        String(
          b.evidenceId
        )
      );
    }
  );

  return {
    artifacts:
      artifacts,
    evidence:
      evidence
  };
}


function careerOsVnextCollectContextRegistrySnapshot_(
  contextFolder
) {
  const contextId =
    String(
      contextFolder.getId()
    );

  const contextLabel =
    String(
      contextFolder.getName()
    );

  const contextResolution =
    careerOsVnextResolveContextLabel_(
      contextLabel
    );

  const sources = [];
  const processing = [];

  const workspaceSnapshot =
    careerOsVnextCollectWorkspaceArtifacts_(
      contextFolder
    );

  const files =
    contextFolder.getFiles();

  while (files.hasNext()) {
    const file =
      files.next();

    const metadata =
      getDriveFileMetadataSafe_(
        file.getId()
      );

    const appProps =
      metadata.appProperties || {};

    if (
      appProps.careerOsGenerated ===
      'true'
    ) {
      continue;
    }

    const fingerprint =
      buildSourceFingerprintFromMetadata_(
        metadata
      );

    const sourceKey =
      'drive:' +
      file.getId();

    const sourceVersionKey =
      sourceKey +
      '@' +
      String(
        fingerprint ||
        (
          'modified:' +
          String(
            metadata.modifiedTime ||
            ''
          )
        )
      );

    const sourceType =
      careerOsVnextClassifySourceType_(
        file.getMimeType(),
        file.getName()
      );

    sources.push({
      sourceKey:
        sourceKey,
      sourceVersionKey:
        sourceVersionKey,
      sourceId:
        file.getId(),
      sourceSystem:
        'drive',
      sourceType:
        sourceType,
      name:
        file.getName(),
      mimeType:
        file.getMimeType(),
      fingerprint:
        fingerprint,
      modifiedAt:
        metadata.modifiedTime ||
        file.getLastUpdated()
          .toISOString(),
      contextId:
        contextId
    });

    const status =
      careerOsVnextSourceProcessingStatus_(
        file.getMimeType(),
        appProps
      );

    if (status) {
      processing.push({
        processingId:
          'drive:' +
          file.getId() +
          ':' +
          sourceVersionKey,
        sourceVersionKey:
          sourceVersionKey,
        status:
          status,
        sourceType:
          sourceType
      });
    }
  }

  sources.sort(
    function(a, b) {
      return String(
        a.sourceKey
      ).localeCompare(
        String(
          b.sourceKey
        )
      );
    }
  );

  processing.sort(
    function(a, b) {
      return String(
        a.processingId
      ).localeCompare(
        String(
          b.processingId
        )
      );
    }
  );

  return {
    context: {
      contextId:
        'drive-folder:' +
        contextId,
      nativeContextId:
        contextId,
      contextKind:
        contextResolution.contextKind,
      label:
        contextLabel,
      resolutionStatus:
        contextResolution.status,
      resolutionMethod:
        contextResolution.method
    },
    sources:
      sources,
    artifacts:
      workspaceSnapshot.artifacts,
    evidence:
      workspaceSnapshot.evidence,
    processing:
      processing
  };
}


function careerOsVnextJsonl_(
  rows
) {
  if (
    !rows ||
    rows.length === 0
  ) {
    return '';
  }

  return rows.map(
    function(row) {
      return JSON.stringify(
        row
      );
    }
  ).join('\n') + '\n';
}


function careerOsVnextWriteContextRegistryProjection_(
  contextFolder
) {
  if (!contextFolder) {
    throw new Error(
      'Context folder is required.'
    );
  }

  const snapshot =
    careerOsVnextCollectContextRegistrySnapshot_(
      contextFolder
    );

  const workspace =
    careerOsVnextGetOrCreateChildFolder_(
      contextFolder,
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );

  const registryFolder =
    careerOsVnextGetOrCreateChildFolder_(
      workspace,
      'REGISTRY'
    );

  const manifest = {
    schemaVersion:
      '0.1',
    generatedAt:
      new Date()
        .toISOString(),
    context:
      snapshot.context,
    counts: {
      sources:
        snapshot.sources.length,
      artifacts:
        snapshot.artifacts.length,
      evidence:
        snapshot.evidence.length,
      processing:
        snapshot.processing.length
    }
  };

  const contextId =
    snapshot.context.contextId;

  careerOsVnextWriteOwnedText_(
    workspace,
    'CONTEXT_MANIFEST.json',
    JSON.stringify(
      manifest,
      null,
      2
    ) + '\n',
    contextId,
    'CONTEXT_MANIFEST'
  );

  careerOsVnextWriteOwnedText_(
    registryFolder,
    'sources.jsonl',
    careerOsVnextJsonl_(
      snapshot.sources
    ),
    contextId,
    'REGISTRY_SOURCES'
  );

  careerOsVnextWriteOwnedText_(
    registryFolder,
    'artifacts.jsonl',
    careerOsVnextJsonl_(
      snapshot.artifacts
    ),
    contextId,
    'REGISTRY_ARTIFACTS'
  );

  careerOsVnextWriteOwnedText_(
    registryFolder,
    'evidence.jsonl',
    careerOsVnextJsonl_(
      snapshot.evidence
    ),
    contextId,
    'REGISTRY_EVIDENCE'
  );

  careerOsVnextWriteOwnedText_(
    registryFolder,
    'processing.jsonl',
    careerOsVnextJsonl_(
      snapshot.processing
    ),
    contextId,
    'REGISTRY_PROCESSING'
  );

  return {
    ok:
      true,
    context:
      snapshot.context,
    counts:
      manifest.counts,
    workspaceId:
      workspace.getId(),
    registryFolderId:
      registryFolder.getId()
  };
}
