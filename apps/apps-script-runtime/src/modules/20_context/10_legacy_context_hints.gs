// Legacy context inference signals retained as compatibility hints.

function inferCourseSessionFromFilename_(
  filename
) {

  const raw =
    String(
      filename || ''
    );


  const dot =
    raw.lastIndexOf(
      '.'
    );


  const base =
    (
      dot > 0
        ? raw.substring(
            0,
            dot
          )
        : raw
    )
      .trim();


  /*
   * Conservative filename parser.
   *
   * Examples:
   *   SAMPLE_COURSE_A L8        -> course=SAMPLE_COURSE_A, session=L8
   *   SAMPLE_COURSE_B R03       -> course=SAMPLE_COURSE_B, session=R03
   *   SAMPLE_COURSE_A Lecture 8 -> course=SAMPLE_COURSE_A, session=Lecture 8
   *   SAMPLE_COURSE_A Session 8 -> course=SAMPLE_COURSE_A, session=Session 8
   *
   * If the filename does not match one of these deterministic
   * patterns, we deliberately return UNKNOWN instead of guessing.
   */

  let match =
    base.match(
      /^(.*?)\s+((?:L|R)\d{1,3})\b/i
    );


  if (match) {
    return {
      course:
        cleanInferredLabel_(
          match[1]
        ),

      session:
        match[2]
          .toUpperCase(),

      basis:
        'filename_deterministic'
    };
  }


  match =
    base.match(
      /^(.*?)\s+(Lecture|Session)\s*[-_ ]*(\d{1,3})\b/i
    );


  if (match) {
    return {
      course:
        cleanInferredLabel_(
          match[1]
        ),

      session:
        capitalizeFirst_(
          match[2]
        ) +
        ' ' +
        match[3],

      basis:
        'filename_deterministic'
    };
  }


  return {
    course:
      'UNKNOWN',

    session:
      'UNKNOWN',

    basis:
      'unresolved'
  };
}

function cleanInferredLabel_(
  value
) {

  const cleaned =
    String(
      value || ''
    )
      .replace(
        /[_-]+$/g,
        ''
      )
      .trim();


  return (
    cleaned ||
    'UNKNOWN'
  );
}

function capitalizeFirst_(
  value
) {

  const text =
    String(
      value || ''
    )
      .toLowerCase();


  if (!text) {
    return '';
  }


  return (
    text.charAt(0)
      .toUpperCase() +
    text.slice(1)
  );
}

function getParentFolderNameSafe_(
  file
) {

  try {

    const parents =
      file.getParents();


    if (
      parents.hasNext()
    ) {
      return (
        parents.next()
          .getName()
      );
    }

  } catch (error) {

    console.log(
      'PARENT_FOLDER_METADATA_WARNING: ' +
      String(error)
    );
  }


  return 'UNKNOWN';
}

function looksLikeSessionFolderLabel_(
  name
) {
  const value =
    String(name || '')
      .trim();

  if (!value) {
    return false;
  }

  // Conservative canonical session labels.
  // Examples:
  //   8
  //   L8 / R03 / S12
  //   Session 8 / SESSION_08
  //   Lecture 8 / Chapter 16 / Week 3 / Block 2
  //
  // A folder that does not look like a session label is NOT auto-promoted
  // merely because it happens to be two levels deep in Drive.
  return (
    /^\d{1,4}$/i.test(value) ||
    /^(?:L|R|S)\s*[-_]?\s*\d{1,4}$/i.test(value) ||
    /^(?:SESSION|LECTURE|CHAPTER|WEEK|BLOCK|UNIT|MODULE)\s*[-_]?\s*\d{1,4}$/i.test(value)
  );
}

function isReservedNonSessionFolderName_(
  name
) {
  const value =
    String(name || '')
      .trim()
      .toUpperCase();

  return (
    value ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
        .toUpperCase() ||
    value === 'TEACHING_VISUALS'
  );
}

function isValidSessionFolder_(
  folder
) {
  if (!folder) {
    return false;
  }

  try {
    const folderName =
      String(
        folder.getName() || ''
      ).trim();

    // A real session must have an explicit session-like label.
    // This is the main architectural boundary preventing arbitrary nested
    // evidence folders (TEACHING_VISUALS, exports, screenshots, etc.) from
    // becoming fake sessions.
    if (
      isReservedNonSessionFolderName_(
        folderName
      ) ||
      !looksLikeSessionFolderLabel_(
        folderName
      )
    ) {
      return false;
    }

    const parents =
      folder.getParents();

    if (!parents.hasNext()) {
      return false;
    }

    const immediateParent =
      parents.next();

    // Prevent nested support/evidence folders from becoming fake sessions.
    // Example:
    //   SESSION_08 / TEACHING_VISUALS
    // Here SESSION_08 already looks like the session label, so its child
    // TEACHING_VISUALS must not become another session.
    if (
      looksLikeSessionFolderLabel_(
        immediateParent.getName()
      )
    ) {
      return false;
    }

    // A real session may be directly under a course (Course / Session) or
    // under a collection (Course / L / Session). In both cases its immediate
    // parent itself has a parent. A top-level course directly under My Drive
    // does not satisfy this test and must never be treated as a session.
    const upperParents =
      immediateParent.getParents();

    return upperParents.hasNext();

  } catch (error) {
    return false;
  }
}

function isDriveFileInsideValidSession_(
  fileId
) {
  try {
    const file =
      DriveApp.getFileById(
        fileId
      );

    const parents =
      file.getParents();

    if (!parents.hasNext()) {
      return false;
    }

    let parent =
      parents.next();

    let sessionFolder =
      parent;

    if (
      parent.getName() ===
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      const sessionParents =
        parent.getParents();

      if (!sessionParents.hasNext()) {
        return false;
      }

      sessionFolder =
        sessionParents.next();
    }

    return isValidSessionFolder_(
      sessionFolder
    );

  } catch (error) {
    return false;
  }
}
