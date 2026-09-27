// Session workspace folder compatibility.

function getOrCreateSessionWorkspaceFolder_(
  sessionFolder,
  createIfMissing
) {
  const folders =
    sessionFolder.getFoldersByName(
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );

  if (folders.hasNext()) {
    return folders.next();
  }

  if (!createIfMissing) {
    return null;
  }

  const workspace =
    sessionFolder.createFolder(
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );

  console.log(
    'SESSION_WORKSPACE_CREATED: ' +
    sessionFolder.getName()
  );

  return workspace;
}

function tagSessionWorkspaceFolder_(
  workspaceFolder,
  sessionFolderId
) {
  if (!workspaceFolder) {
    return;
  }

  updateAppPropertiesIfChanged_(
    workspaceFolder.getId(),
    {
      careerOsGenerated:
        'true',

      careerOsWorkspace:
        'true',

      careerOsSessionFolderId:
        String(sessionFolderId)
    },
    'SESSION_WORKSPACE_TAG_WARNING'
  );
}

function organizeSessionTxtFiles_(
  sessionFolder,
  workspaceFolder
) {
  const files =
    sessionFolder.getFiles();

  while (files.hasNext()) {
    const file =
      files.next();

    const name =
      file.getName();

    if (
      !/\.txt$/i.test(name)
    ) {
      continue;
    }

    file.moveTo(
      workspaceFolder
    );

    tagExternalTextEvidence_(
      file,
      sessionFolder.getId()
    );

    console.log(
      'SESSION_TXT_MOVED: ' +
      name +
      ' -> ' +
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );
  }
}
