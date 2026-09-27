// Extracted audio provider upload transport.

function startGeminiResumableUpload_(
  job
) {
  const apiKey =
    getGeminiApiKey_();


  const url =
    'https://generativelanguage.googleapis.com/upload/v1beta/files';


  const response =
    UrlFetchApp.fetch(
      url,
      {
        method:
          'post',

        contentType:
          'application/json',

        headers: {
          'x-goog-api-key':
            apiKey,

          'X-Goog-Upload-Protocol':
            'resumable',

          'X-Goog-Upload-Command':
            'start',

          'X-Goog-Upload-Header-Content-Length':
            String(
              job.size
            ),

          'X-Goog-Upload-Header-Content-Type':
            job.mimeType
        },

        payload:
          JSON.stringify({
            file: {
              display_name:
                job.name
            }
          }),

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();

  const body =
    response.getContentText();


  if (
    status < 200 ||
    status >= 300
  ) {

    console.log(
      'GEMINI_UPLOAD_START_ERROR: ' +
      status
    );

    console.log(body);


    throw createRetryAwareHttpError_(
      'Could not start Gemini resumable upload.',
      status,
      response,
      body
    );
  }


  const headers =
    response.getAllHeaders();


  const uploadUrl =
    getHeaderCaseInsensitive_(
      headers,
      'x-goog-upload-url'
    );


  if (!uploadUrl) {
    throw new Error(
      'Gemini did not return ' +
      'X-Goog-Upload-URL.'
    );
  }


  const granularityHeader =
    getHeaderCaseInsensitive_(
      headers,
      'x-goog-upload-chunk-granularity'
    );


  const granularity =
    Number(
      granularityHeader || 0
    );


  let chunkSize =
    CAREER_OS_CONFIG
      .AUDIO_CHUNK_TARGET_BYTES;


  if (granularity > 0) {

    chunkSize =
      Math.floor(
        chunkSize /
        granularity
      ) *
      granularity;


    if (
      chunkSize <
      granularity
    ) {
      chunkSize =
        granularity;
    }
  }


  // Keep safely below Apps Script POST limits.
  if (
    chunkSize >
    32 * 1024 * 1024
  ) {

    throw new Error(
      'Gemini upload chunk granularity ' +
      'is too large for Apps Script.'
    );
  }


  job.uploadUrl =
    String(uploadUrl);

  job.offset =
    0;

  job.chunkSize =
    chunkSize;

  job.status =
    'UPLOADING';

  job.lastError =
    '';


  console.log(
    'AUDIO_UPLOAD_SESSION_STARTED: ' +
    job.name +
    ' | chunk=' +
    job.chunkSize
  );
}

function syncGeminiUploadOffset_(
  job
) {

  if (!job.uploadUrl) {

    job.status =
      'QUEUED';

    job.offset =
      0;

    return;
  }


  const response =
    UrlFetchApp.fetch(
      job.uploadUrl,
      {
        method:
          'post',

        headers: {
          'X-Goog-Upload-Command':
            'query'
        },

        payload:
          '',

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();


  if (
    status < 200 ||
    status >= 300
  ) {

    throw createRetryAwareHttpError_(
      'Could not query Gemini upload offset.',
      status,
      response,
      response.getContentText()
    );
  }


  const headers =
    response.getAllHeaders();


  const uploadStatus =
    String(
      getHeaderCaseInsensitive_(
        headers,
        'x-goog-upload-status'
      ) ||
      'active'
    )
      .toLowerCase();


  const received =
    Number(
      getHeaderCaseInsensitive_(
        headers,
        'x-goog-upload-size-received'
      ) ||
      0
    );


  if (
    uploadStatus !==
    'active'
  ) {

    if (!job.fileUri) {

      console.log(
        'AUDIO_UPLOAD_SESSION_NOT_ACTIVE_RESTARTING: ' +
        job.name
      );


      job.status =
        'QUEUED';

      job.uploadUrl =
        '';

      job.offset =
        0;

      return;
    }
  }


  job.offset =
    received;


  console.log(
    'AUDIO_UPLOAD_RESUME_AT: ' +
    job.name +
    ' | offset=' +
    job.offset
  );
}

function uploadNextAudioChunk_(
  job
) {

  if (
    job.offset >=
    job.size
  ) {

    if (job.fileUri) {

      job.status =
        'READY_TO_TRANSCRIBE';

      return;
    }


    throw new Error(
      'Upload offset reached file size ' +
      'but Gemini file URI is missing.'
    );
  }


  const start =
    Number(
      job.offset
    );


  const endExclusive =
    Math.min(
      start +
      Number(
        job.chunkSize
      ),

      Number(
        job.size
      )
    );


  const endInclusive =
    endExclusive -
    1;


  const expectedLength =
    endExclusive -
    start;


  const isFinal =
    endExclusive >=
    Number(
      job.size
    );


  const bytes =
    readDriveByteRange_(
      job.fileId,
      start,
      endInclusive
    );


  if (
    bytes.length !==
    expectedLength
  ) {

    throw new Error(
      'Drive returned ' +
      bytes.length +
      ' bytes, expected ' +
      expectedLength +
      '.'
    );
  }


  const response =
    UrlFetchApp.fetch(
      job.uploadUrl,
      {
        method:
          'post',

        contentType:
          job.mimeType,

        headers: {

          'X-Goog-Upload-Offset':
            String(start),

          'X-Goog-Upload-Command':
            isFinal
              ? 'upload, finalize'
              : 'upload'
        },

        payload:
          bytes,

        muteHttpExceptions:
          true
      }
    );


  const status =
    response.getResponseCode();

  const body =
    response.getContentText();


  if (
    status < 200 ||
    status >= 300
  ) {

    console.log(
      'GEMINI_AUDIO_CHUNK_UPLOAD_ERROR: ' +
      status
    );

    console.log(body);


    throw createRetryAwareHttpError_(
      'Gemini chunk upload failed.',
      status,
      response,
      body
    );
  }


  job.offset =
    endExclusive;

  job.lastError =
    '';


  if (isFinal) {

    const data =
      body
        ? JSON.parse(body)
        : {};


    const file =
      data.file ||
      data;


    job.fileUri =
      file.uri ||
      '';


    job.geminiFileName =
      file.name ||
      '';


    if (!job.fileUri) {

      throw new Error(
        'Gemini finalized the upload ' +
        'but returned no file URI.'
      );
    }


    job.status =
      'READY_TO_TRANSCRIBE';


    console.log(
      'AUDIO_UPLOAD_COMPLETE: ' +
      job.name
    );


    return;
  }


  const percent =
    Math.floor(
      (
        job.offset /
        job.size
      ) *
      100
    );


  console.log(
    'AUDIO_UPLOAD_PROGRESS: ' +
    job.name +
    ' | ' +
    percent +
    '%'
  );
}
