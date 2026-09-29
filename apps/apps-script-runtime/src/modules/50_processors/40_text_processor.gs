// Text evidence compatibility processor.

function handleTextEvidence_(
  fileMeta
) {
  const file =
    DriveApp.getFileById(
      fileMeta.id
    );

  const context =
    resolveSessionContext_(
      file,
      true
    );

  if (!context) {
    console.log(
      'TEXT_EVIDENCE_UNROUTED: ' +
      file.getName()
    );

    return;
  }

  if (
    /\.txt$/i.test(
      file.getName()
    ) &&
    getParentFolder_(file)
      .getId() !==
      context.workspaceFolderId
  ) {
    file.moveTo(
      context.workspaceFolder
    );

    console.log(
      'TEXT_EVIDENCE_MOVED_TO_SESSION_WORKSPACE: ' +
      file.getName()
    );
  }

  tagExternalTextEvidence_(
    file,
    context.sessionFolderId
  );

  updateSessionManifest_(
    context.sessionFolder
  );

  careerOsMarkSessionKnowledgeDirty_(
    context.sessionFolderId,
    'text_evidence_ready'
  );

  console.log(
    'TEXT_EVIDENCE_READY: ' +
    file.getName()
  );
}

function tagExternalTextEvidence_(
  file,
  sessionFolderId
) {
  try {
    const metadata =
      Drive.Files.get(
        file.getId(),
        {
          fields:
            'id,appProperties'
        }
      );

    const existing =
      metadata.appProperties || {};

    if (
      existing.careerOsGenerated ===
      'true'
    ) {
      return;
    }

    updateAppPropertiesIfChanged_(
      file.getId(),
      {
        careerOsSessionFolderId:
          String(sessionFolderId),

        careerOsEvidenceType:
          'external_text'
      },
      'TEXT_EVIDENCE_TAG_WARNING'
    );

  } catch (error) {
    console.log(
      'TEXT_EVIDENCE_TAG_WARNING: ' +
      String(error)
    );
  }
}
