// Extracted PDF processor compatibility path.

function handlePdfEvidence_(fileMeta) {
  const sourceFile =
    DriveApp.getFileById(
      fileMeta.id
    );

  const context =
    prepareSessionWorkspace_(
      sourceFile
    );

  const sourceFingerprint =
    fileMeta.sourceFingerprint ||
    getSourceFingerprintFromFileMeta_(
      fileMeta
    );

  if (
    hasCurrentGeneratedArtifactForSource_(
      sourceFile,
      context.workspaceFolder,
      sourceFingerprint,
      fileMeta.modifiedTime || ''
    )
  ) {
    markPdfSourceProcessingStatus_(
      sourceFile.getId(),
      'DONE',
      sourceFingerprint,
      fileMeta.modifiedTime || '',
      'existing_artifact',
      ''
    );

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

  return careerOsVnextDocumentExtract_(
    {
      apiKey:
        getGeminiApiKey_(),
      base64Data:
        base64Data,
      mimeType:
        'application/pdf',
      prompt:
        prompt
    }
  );
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
