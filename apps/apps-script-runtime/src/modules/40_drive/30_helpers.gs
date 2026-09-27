// Drive lookup compatibility helpers.

function getDriveFileMetadataSafe_(
  fileId
) {
  try {
    return Drive.Files.get(
      fileId,
      {
        fields:
          'id,name,mimeType,modifiedTime,size,' +
          'md5Checksum,sha1Checksum,sha256Checksum,' +
          'appProperties'
      }
    );

  } catch (error) {
    return {
      appProperties: {}
    };
  }
}

function getParentFolder_(
  file
) {

  const parents =
    file.getParents();


  if (
    parents.hasNext()
  ) {
    return (
      parents.next()
    );
  }


  return (
    DriveApp
      .getRootFolder()
  );
}
