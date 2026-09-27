// Session context/workspace compatibility.

function prepareSessionWorkspaceForSourceId_(
  fileId
) {
  const sourceFile =
    DriveApp.getFileById(
      fileId
    );

  return prepareSessionWorkspace_(
    sourceFile
  );
}

function prepareSessionWorkspace_(
  sourceFile
) {
  const context =
    resolveSessionContext_(
      sourceFile,
      true
    );

  if (!context) {
    throw new Error(
      'Could not resolve session folder for ' +
      sourceFile.getName()
    );
  }

  organizeSessionTxtFiles_(
    context.sessionFolder,
    context.workspaceFolder
  );

  tagSessionWorkspaceFolder_(
    context.workspaceFolder,
    context.sessionFolderId
  );

  updateSessionManifest_(
    context.sessionFolder
  );

  return context;
}

function resolveSessionContext_(
  file,
  createWorkspace
) {
  try {
    const parents =
      file.getParents();

    if (!parents.hasNext()) {
      return null;
    }

    let parent =
      parents.next();

    let sessionFolder;
    let workspaceFolder = null;

    if (
      parent.getName() ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      workspaceFolder =
        parent;

      const sessionParents =
        parent.getParents();

      if (!sessionParents.hasNext()) {
        return null;
      }

      sessionFolder =
        sessionParents.next();

    } else {
      sessionFolder =
        parent;
    }

    if (!workspaceFolder) {
      workspaceFolder =
        getOrCreateSessionWorkspaceFolder_(
          sessionFolder,
          Boolean(createWorkspace)
        );
    }

    const hierarchy =
      resolveCourseHierarchyForSessionFolder_(
        sessionFolder
      );

    const courseFolder =
      hierarchy.courseFolder;

    const collectionFolder =
      hierarchy.collectionFolder;

    return {
      sessionFolder:
        sessionFolder,

      sessionFolderId:
        sessionFolder.getId(),

      sessionFolderName:
        sessionFolder.getName(),

      workspaceFolder:
        workspaceFolder,

      workspaceFolderId:
        workspaceFolder
          ? workspaceFolder.getId()
          : '',

      courseFolder:
        courseFolder,

      courseFolderId:
        courseFolder
          ? courseFolder.getId()
          : '',

      courseFolderName:
        courseFolder
          ? courseFolder.getName()
          : 'UNKNOWN',

      collectionFolder:
        collectionFolder,

      collectionFolderId:
        collectionFolder
          ? collectionFolder.getId()
          : '',

      collectionFolderName:
        collectionFolder
          ? collectionFolder.getName()
          : ''
    };

  } catch (error) {
    console.log(
      'SESSION_CONTEXT_WARNING: ' +
      String(error)
    );

    return null;
  }
}

function resolveCourseHierarchyForSessionFolder_(
  sessionFolder
) {
  let immediateParent = null;

  try {
    const parents =
      sessionFolder.getParents();

    if (parents.hasNext()) {
      immediateParent =
        parents.next();
    }
  } catch (error) {
    return {
      courseFolder: null,
      collectionFolder: null
    };
  }

  if (!immediateParent) {
    return {
      courseFolder: null,
      collectionFolder: null
    };
  }

  const immediateName =
    String(
      immediateParent.getName() || ''
    ).trim();

  // Structural containers are not course identities.
  // SAMPLE_COURSE_A / L / 10 => course=SAMPLE_COURSE_A, collection=L, session=10.
  const isCollectionFolder =
    /^(?:l|lectures?|sessions?|classes?|weeks?|meetings?|recordings?)$/i
      .test(immediateName);

  if (isCollectionFolder) {
    const grandparents =
      immediateParent.getParents();

    if (grandparents.hasNext()) {
      return {
        courseFolder:
          grandparents.next(),
        collectionFolder:
          immediateParent
      };
    }
  }

  return {
    courseFolder:
      immediateParent,
    collectionFolder:
      null
  };
}
