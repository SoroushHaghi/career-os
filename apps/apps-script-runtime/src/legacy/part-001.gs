
    console.log(
      'PDF_ALREADY_PROCESSED_FOR_VERSION: ' +
      sourceFile.getName()
    );

    updateSessionManifest_(
      context.sessionFolder
    );
    return;
  }

  markPdfSourceProcessingStatus_(
    sourceFile.getId(),
    'PROCESSING',
    sourceFingerprint,
    fileMeta.modifiedTime || '',
    '',
    ''
  );

  let extractedText = '';
  let extractionMethod = '';
  let extractionModel = '';

  try {
    const driveResult =
      extractPdfTextViaDriveImport_(
        sourceFile,
        context.workspaceFolder
      );

    extractedText =
      String(
        driveResult.text || ''
      ).trim();

    if (
      extractedText.length >=
      CAREER_OS_CONFIG
        .PDF_DRIVE_IMPORT_MIN_TEXT_CHARS
    ) {
      extractionMethod =
        'google_drive_to_docs';
      extractionModel =
        'google-drive-docs-import';

      console.log(
        'PDF_DRIVE_TEXT_EXTRACTED: ' +
        sourceFile.getName() +
        ' | chars=' +
        extractedText.length
      );
    } else {
      console.log(
        'PDF_DRIVE_TEXT_INSUFFICIENT_FALLBACK_TO_GEMINI: ' +
        sourceFile.getName() +
        ' | chars=' +
        extractedText.length
      );

      const geminiResult =
        extractPdfTextViaGemini_(
          sourceFile
        );

      extractedText =
        String(
          geminiResult.text || ''
        ).trim();

      extractionMethod =
        'gemini_pdf_document_fallback';
      extractionModel =
        geminiResult.model || '';
    }

    if (
      !extractedText ||
      extractedText ===
        '[NO_TEXT_FOUND]'
    ) {
      throw new Error(
        'No readable text could be extracted from PDF.'
      );
    }

    const sourceMetadata =
      getDriveFileMetadataSafe_(
        sourceFile.getId()
      );

    const portableText =
      buildPortableArtifact_(
        sourceFile,
        extractedText,
        {
          artifactType:
            'pdf_text_extraction',

          sourceMimeType:
            'application/pdf',

          sourceSizeBytes:
            sourceMetadata.size ||
            fileMeta.size ||
            '',

          sourceModifiedUtc:
            sourceMetadata.modifiedTime ||
            fileMeta.modifiedTime ||
            '',

          sourceFingerprint:
            sourceFingerprint,

          model:
            extractionModel,

          timestampMode:
            'not_applicable',

          timestampNote:
            'PDF text extraction; no media timestamps.',

          extractionMethod:
            extractionMethod
        }
      );

    createOrUpdateTxtSidecar_(
      sourceFile,
      portableText
    );

    markPdfSourceProcessingStatus_(
      sourceFile.getId(),
      'DONE',
      sourceFingerprint,
      sourceMetadata.modifiedTime ||
        fileMeta.modifiedTime || '',
      extractionMethod,
      ''
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    console.log(
      'PDF_TEXT_DONE: ' +
      sourceFile.getName() +
      ' | method=' +
      extractionMethod +
      ' | chars=' +
      extractedText.length
    );

  } catch (error) {
    markPdfSourceProcessingStatus_(
      sourceFile.getId(),
      'ERROR',
      sourceFingerprint,
      fileMeta.modifiedTime || '',
      extractionMethod,
      String(error)
    );

    updateSessionManifest_(
      context.sessionFolder
    );

    console.log(
      'PDF_TEXT_ERROR: ' +
      sourceFile.getName() +
      ' | ' +
      String(error)
    );
  }
}


function extractPdfTextViaDriveImport_(
  sourceFile,
  workspaceFolder
) {
  let tempDocId = '';

  try {
    const tempName =
      '_CAREER_OS_TMP_PDF__' +
      sourceFile.getId();

    // Convert the PDF by importing its binary content as a Google Doc.
    // This uses the Drive API import path (free/standard Drive operation),
    // which can expose embedded text and can OCR image-based PDF pages.
    const sourceBlob =
      sourceFile.getBlob();

    const converted =
      Drive.Files.create(
        {
          name: tempName,
          mimeType:
            'application/vnd.google-apps.document',
          parents: [
            workspaceFolder.getId()
          ]
        },
        sourceBlob,
        {
          fields:
            'id,name,mimeType'
        }
      );

    tempDocId =
      converted.id;

    updateAppPropertiesIfChanged_(
      tempDocId,
      {
        careerOsGenerated: 'true',
        careerOsTemporary: 'true',
        careerOsSourceId:
          sourceFile.getId()
      },
      'PDF_TEMP_DOC_MARK_WARNING'
    );

    // Conversion/OCR can finish slightly after the Drive file is created.
    // Poll a few times rather than assuming the Doc body is immediately ready.
    let lastText = '';

    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        Utilities.sleep(1000);
      }

      try {
        const doc =
          DocumentApp.openById(
            tempDocId
          );

        lastText =
          String(
            doc.getBody().getText() || ''
          );

        if (
          lastText.trim().length >=
          CAREER_OS_CONFIG
            .PDF_DRIVE_IMPORT_MIN_TEXT_CHARS
        ) {
          break;
        }
      } catch (openError) {
        if (attempt === 4) {
          throw openError;
        }
      }
    }

    return {
      text: lastText
    };

  } finally {
    if (tempDocId) {
      try {
        Drive.Files.update(
          { trashed: true },
          tempDocId
        );
      } catch (cleanupError) {
        console.log(
          'PDF_TEMP_DOC_CLEANUP_WARNING: ' +
          String(cleanupError)
        );
      }
    }
  }
}


function extractPdfTextViaGemini_(
  sourceFile
) {
  assertFreeOnlyConfiguration_();

  const blob =
    sourceFile.getBlob();

  const bytes =
    blob.getBytes();

  if (
    bytes.length >
    CAREER_OS_CONFIG
      .PDF_GEMINI_INLINE_MAX_BYTES
  ) {
    throw new Error(
      'PDF is too large for safe inline Gemini fallback in Apps Script: ' +
      bytes.length + ' bytes.'
    );
  }

  const base64Data =
    Utilities.base64Encode(
      bytes
    );

  const prompt =
    'Extract all readable text from this PDF. ' +
    'Return only the extracted text. ' +
    'Preserve page order and useful line breaks. ' +
    'Do not summarize, explain, translate, or omit readable text. ' +
    'If there is no readable text, return exactly [NO_TEXT_FOUND].';

  return callGeminiDocument_(
    getGeminiApiKey_(),
    base64Data,
    'application/pdf',
    prompt
  );
}


function callGeminiDocument_(
  apiKey,
  base64Data,
  mimeType,
  prompt
) {
  const primaryModel =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_PRIMARY;

  const fallbackModel =
    CAREER_OS_CONFIG
      .GEMINI_IMAGE_MODEL_FALLBACK;

  try {
    return callGeminiDocumentWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      primaryModel
    );
  } catch (primaryError) {
    if (
      !shouldFallbackGeminiImageError_(
        primaryError
      ) ||
      !fallbackModel ||
      fallbackModel === primaryModel
    ) {
      throw primaryError;
    }

    console.log(
      'GEMINI_PDF_PRIMARY_FAILED_FALLBACK: ' +
      primaryModel +
      ' -> ' +
      fallbackModel +
      ' | status=' +
      Number(
        primaryError.httpStatus || 0
      )
    );

    return callGeminiDocumentWithModel_(
      apiKey,
      base64Data,
      mimeType,
      prompt,
      fallbackModel
    );
  }
}


function callGeminiDocumentWithModel_(
  apiKey,
  base64Data,
  mimeType,
  prompt,
  model
) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/interactions';

  const payload = {
    model: model,
    input: [
      {
        type: 'text',
        text: prompt
      },
      {
        type: 'document',
        data: base64Data,
        mime_type: mimeType
      }
    ]
  };

  applyGemini38ThinkingConfig_(
    payload,
    model,
    CAREER_OS_CONFIG.GEMINI_PDF_THINKING_LEVEL
  );

  const response =
    UrlFetchApp.fetch(
      url,
      {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'x-goog-api-key': apiKey
        },
        payload:
          JSON.stringify(payload),
        muteHttpExceptions: true
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
      'GEMINI_PDF_HTTP_ERROR: ' +
      status +
      ' | model=' +
      model
    );

    throw createRetryAwareHttpError_(
      'Gemini PDF request failed for model ' +
      model + '.',
      status,
      response,
      body
    );
  }

  const data =
    JSON.parse(body);

  return {
    text:
      extractGeminiText_(data),
    model:
      model
  };
}


function markPdfSourceProcessingStatus_(
  fileId,
  status,
  sourceFingerprint,
  modifiedTime,
  method,
  errorMessage
) {
  updateAppPropertiesIfChanged_(
    fileId,
    {
      careerOsPdfStatus:
        String(status || ''),
      careerOsPdfProcessedSourceFingerprint:
        String(sourceFingerprint || ''),
      careerOsPdfProcessedSourceModifiedTime:
        String(modifiedTime || ''),
      careerOsPdfExtractionMethod:
        String(method || ''),
      careerOsPdfLastError:
        errorMessage
          ? String(errorMessage)
              .substring(0, 500)
          : ''
    },
    'PDF_STATUS_TAG_WARNING'
  );
}


function backfillOneDeferredInboxPdf_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const key =
    CAREER_OS_CONFIG
      .PDF_BACKFILL_VERSION_PROPERTY;

  const targetVersion =
    CAREER_OS_CONFIG
      .PDF_BACKFILL_VERSION;

  if (
    props.getProperty(key) ===
    targetVersion
  ) {
    return;
  }

  const manifests =
    DriveApp.getFilesByName(
      CAREER_OS_CONFIG
        .SESSION_MANIFEST_FILE
    );

  while (manifests.hasNext()) {
    const manifest =
      manifests.next();

    const workspaceParents =
      manifest.getParents();

    if (!workspaceParents.hasNext()) {
      continue;
    }

    const workspace =
      workspaceParents.next();

    if (
      workspace.getName() !==
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    ) {
      continue;
    }

    const sessionParents =
      workspace.getParents();

    if (!sessionParents.hasNext()) {
      continue;
    }

    const sessionFolder =
      sessionParents.next();

    if (
      !isValidSessionFolder_(
        sessionFolder
      )
    ) {
      continue;
    }

    const hierarchy =
      resolveCourseHierarchyForSessionFolder_(
        sessionFolder
      );

    if (
      !hierarchy.courseFolder ||
      hierarchy.courseFolder.getName() !==
        'INBOX'
    ) {
      continue;
    }

    const sourceFiles =
      sessionFolder.getFilesByType(
        MimeType.PDF
      );

    while (sourceFiles.hasNext()) {
      const sourceFile =
        sourceFiles.next();

      const metadata =
        getDriveFileMetadataSafe_(
          sourceFile.getId()
        );

      const fingerprint =
        buildSourceFingerprintFromMetadata_(
          metadata
        );

      if (
        hasCurrentGeneratedArtifactForSource_(
          sourceFile,
          workspace,
          fingerprint,
          metadata.modifiedTime || ''
        )
      ) {
        continue;
      }

      console.log(
        'PDF_BACKFILL_PROCESSING_ONE: ' +
        sourceFile.getName()
      );

      handlePdfEvidence_(
        {
          id: sourceFile.getId(),
          name: sourceFile.getName(),
          mimeType:
            'application/pdf',
          size:
            metadata.size || '',
          modifiedTime:
            metadata.modifiedTime ||
            sourceFile
              .getLastUpdated()
              .toISOString(),
          sourceFingerprint:
            fingerprint
        }
      );

      // Exactly one legacy/deferred PDF per scanner run.
      return;
    }
  }

  props.setProperty(
    key,
    targetVersion
  );

  console.log(
    'PDF_BACKFILL_COMPLETE: ' +
    targetVersion
  );
}



function isSupportedImageMime_(
  mimeType
) {
  const mime =
    String(mimeType || '')
      .toLowerCase();

  return [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ].includes(mime);
}


function classifyFile_(file) {
  const mime =
    (file.mimeType || '')
      .toLowerCase();

  const appProperties =
    file.appProperties || {};


  // Ignore Career OS-generated artifacts. Their source changes are
  // handled through the original file or explicit session refreshes.
  if (
    appProperties[
      CAREER_OS_CONFIG
        .GENERATED_APP_PROPERTY_KEY
    ] ===
    CAREER_OS_CONFIG
      .GENERATED_APP_PROPERTY_VALUE
  ) {
    return 'IGNORE';
  }


  // Folder rename/move events matter because the folder ID is the
  // canonical session identity while the human-readable name may change.
  if (
    mime ===
    'application/vnd.google-apps.folder'
  ) {
    return 'SESSION_FOLDER_EVENT';
  }


  // Ignore Apps Script projects.
  if (
    mime ===
    'application/vnd.google-apps.script'
  ) {
    return 'IGNORE';
  }


  const supportedImages = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ];


  if (
    supportedImages.includes(mime)
  ) {
    return 'IMAGE_OCR';
  }


  if (
    mime.startsWith('image/')
  ) {
    return 'IMAGE_UNSUPPORTED';
  }


  if (
    mime.startsWith('audio/')
  ) {
    return 'AUDIO_TRANSCRIBE';
  }


  if (
    mime === 'application/pdf'
  ) {
    return 'PDF_EXTRACT';
  }


  // A TXT/MD file is already text. It is evidence, not something that
  // needs another extraction pass. TXT files are organized into the
  // session workspace automatically.
  if (
    mime.startsWith('text/')
  ) {
    return 'TEXT_EVIDENCE';
  }


  if (
    mime ===
    'application/vnd.google-apps.document'
  ) {
    return 'GOOGLE_DOC_EXTRACT';
  }


  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'DOCX_EXTRACT';
  }


  if (
    mime.startsWith('video/')
  ) {
    return 'VIDEO_DEFERRED';
  }


  return 'IGNORE';
}


/* =========================================================
   SOURCE CONTENT FINGERPRINTS + IDEMPOTENT METADATA

   File ID = source identity.
   Content checksum = source version.
   modifiedTime is informational only and is NOT used as the
   primary version key for binary Drive files.
   ========================================================= */


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
