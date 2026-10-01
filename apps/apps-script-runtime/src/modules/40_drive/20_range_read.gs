// Extracted Drive ranged-read transport.

function readDriveByteRange_(
  fileId,
  start,
  endInclusive
) {

  const url =
    'https://www.googleapis.com/drive/v3/files/' +
    encodeURIComponent(
      fileId
    ) +
    '?alt=media';


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method:
          'get',

        headers: {

          Authorization:
            'Bearer ' +
            ScriptApp
              .getOAuthToken(),

          Range:
            'bytes=' +
            start +
            '-' +
            endInclusive
        },

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();


  if (
    status !== 206 &&
    status !== 200
  ) {

    throw createRetryAwareHttpError_(
      'Drive partial download failed.',
      status,
      response,
      response.getContentText()
    );
  }


  const bytes =
    response
      .getBlob()
      .getBytes();


  const expectedLength =
    endInclusive -
    start +
    1;


  if (
    status === 200 &&
    bytes.length !==
      expectedLength
  ) {

    throw new Error(
      'Drive ignored the Range request; ' +
      'refusing to load the whole large file.'
    );
  }


  return bytes;
}
