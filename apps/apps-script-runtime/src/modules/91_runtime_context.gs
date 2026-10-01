function careerOsVnextCsvPropertySet_(name) {
  const raw =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          String(name)
        ) ||
      ''
    );

  const values =
    raw.split(',')
      .map(
        function(value) {
          return String(
            value
          ).trim();
        }
      )
      .filter(
        function(value) {
          return Boolean(value);
        }
      );

  const out = {};

  values.forEach(
    function(value) {
      out[value] = true;
    }
  );

  return out;
}


function careerOsVnextAuthorizedContextIds_() {
  const ids =
    careerOsVnextCsvPropertySet_(
      'CAREER_OS_VNEXT_ALLOWED_CONTEXT_IDS'
    );

  const props =
    PropertiesService
      .getScriptProperties();

  const environment =
    String(
      props.getProperty(
        'CAREER_OS_ENVIRONMENT'
      ) ||
      ''
    ).trim()
      .toLowerCase();

  if (
    environment ===
    'staging'
  ) {
    const stagingFolderId =
      String(
        props.getProperty(
          'CAREER_OS_STAGING_TEST_FOLDER_ID'
        ) ||
        ''
      ).trim();

    if (stagingFolderId) {
      ids[
        stagingFolderId
      ] = true;
    }
  }

  return ids;
}


function careerOsVnextAuthorizedSourceIds_() {
  return careerOsVnextCsvPropertySet_(
    'CAREER_OS_VNEXT_ALLOWED_SOURCE_IDS'
  );
}


function careerOsVnextParentFoldersForFile_(
  fileId
) {
  const out = [];

  try {
    const file =
      DriveApp.getFileById(
        String(fileId)
      );

    const parents =
      file.getParents();

    while (
      parents.hasNext()
    ) {
      out.push(
        parents.next()
      );
    }

  } catch (error) {
    console.log(
      'VNEXT_CONTEXT_PARENT_WARNING: ' +
      String(error)
    );
  }

  return out;
}


function careerOsVnextResolveProcessingContextForFile_(
  fileMeta
) {
  const sourceId =
    String(
      fileMeta &&
      fileMeta.id ||
      ''
    );

  if (!sourceId) {
    return {
      status:
        'BLOCKED_POLICY',
      reason:
        'missing_source_id',
      contextFolder:
        null
    };
  }

  const parents =
    careerOsVnextParentFoldersForFile_(
      sourceId
    );

  for (
    let i = 0;
    i < parents.length;
    i += 1
  ) {
    const folder =
      parents[i];

    if (
      isValidSessionFolder_(
        folder
      )
    ) {
      return {
        status:
          'RESOLVED_PRIMARY',
        reason:
          'legacy_session_hint',
        contextKind:
          'session',
        contextFolder:
          folder
      };
    }
  }

  const allowedContexts =
    careerOsVnextAuthorizedContextIds_();

  for (
    let i = 0;
    i < parents.length;
    i += 1
  ) {
    const folder =
      parents[i];

    if (
      allowedContexts[
        String(
          folder.getId()
        )
      ]
    ) {
      return {
        status:
          'UNCLASSIFIED_AUTHORIZED',
        reason:
          'explicit_context_allowlist',
        contextKind:
          'unclassified',
        contextFolder:
          folder
      };
    }
  }

  const allowedSources =
    careerOsVnextAuthorizedSourceIds_();

  if (
    allowedSources[
      sourceId
    ]
  ) {
    return {
      status:
        'UNCLASSIFIED_AUTHORIZED',
      reason:
        'explicit_source_allowlist',
      contextKind:
        'unclassified',
      contextFolder:
        parents.length
          ? parents[0]
          : null
    };
  }

  return {
    status:
      'BLOCKED_POLICY',
    reason:
      'outside_processing_scope',
    contextKind:
      null,
    contextFolder:
      null
  };
}


function careerOsVnextRegisterHeldSource_(
  fileMeta,
  contextDecision
) {
  if (
    !contextDecision ||
    contextDecision.status !==
      'UNCLASSIFIED_AUTHORIZED' ||
    !contextDecision
      .contextFolder
  ) {
    return {
      ok:
        false,
      held:
        false
    };
  }

  const registry =
    careerOsVnextWriteContextRegistryProjection_(
      contextDecision
        .contextFolder
    );

  console.log(
    'VNEXT_UNCLASSIFIED_AUTHORIZED_HELD: ' +
    String(
      fileMeta &&
      fileMeta.name ||
      fileMeta &&
      fileMeta.id ||
      ''
    )
  );

  return {
    ok:
      true,
    held:
      true,
    registry:
      registry
  };
}
