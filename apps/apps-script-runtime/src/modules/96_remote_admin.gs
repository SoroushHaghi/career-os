const CAREER_OS_REMOTE_ADMIN_VERSION =
  'career-os-staging-admin-v1';

const CAREER_OS_REMOTE_ADMIN_MAX_SKEW_SECONDS = 300;

const CAREER_OS_REMOTE_ADMIN_PROPERTY_ALLOWLIST = [
  'CAREER_OS_AUDIO_TRANSCRIPTION_PROVIDER',
  'CAREER_OS_AUDIO_PROXY_BASE_URL',
  'CAREER_OS_STAGING_LIVE_PROVIDER_TEST',
  'CAREER_OS_STAGING_TEST_FOLDER_ID',
  'GROQ_API_KEY',
  'GEMINI_API_KEY'
];

function careerOsRemoteAdminJson_(value, status) {
  const body = Object.assign(
    {
      ok:
        status === undefined ||
        Number(status) < 400
    },
    value || {}
  );

  return ContentService
    .createTextOutput(
      JSON.stringify(body)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

function careerOsRemoteAdminHex_(bytes) {
  return (bytes || [])
    .map(function(value) {
      const normalized =
        Number(value) < 0
          ? Number(value) + 256
          : Number(value);

      return normalized
        .toString(16)
        .padStart(2, '0');
    })
    .join('');
}

function careerOsRemoteAdminConstantTimeEqual_(
  left,
  right
) {
  const a = String(left || '');
  const b = String(right || '');

  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (
    let index = 0;
    index < a.length;
    index += 1
  ) {
    diff |=
      a.charCodeAt(index) ^
      b.charCodeAt(index);
  }

  return diff === 0;
}

function careerOsRemoteAdminAssertStaging_() {
  const props =
    PropertiesService
      .getScriptProperties();

  const environment =
    String(
      props.getProperty(
        'CAREER_OS_ENVIRONMENT'
      ) || ''
    )
      .trim()
      .toLowerCase();

  if (environment !== 'staging') {
    throw new Error(
      'Remote admin is staging-only.'
    );
  }

  return props;
}

function careerOsRemoteAdminAuthenticate_(
  requestBody
) {
  const props =
    careerOsRemoteAdminAssertStaging_();

  const sharedSecret =
    String(
      props.getProperty(
        'CAREER_OS_AUDIO_PROXY_SHARED_SECRET'
      ) || ''
    ).trim();

  if (!sharedSecret) {
    throw new Error(
      'Remote admin auth secret is unavailable.'
    );
  }

  const ts =
    Number(
      requestBody &&
      requestBody.ts
    );

  const nonce =
    String(
      requestBody &&
      requestBody.nonce ||
      ''
    );

  const payload =
    String(
      requestBody &&
      requestBody.payload ||
      ''
    );

  const signature =
    String(
      requestBody &&
      requestBody.sig ||
      ''
    )
      .trim()
      .toLowerCase();

  if (
    !Number.isFinite(ts) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(
      nonce
    ) ||
    !payload ||
    payload.length > 50000 ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    throw new Error(
      'Remote admin request is malformed.'
    );
  }

  const now =
    Math.floor(
      Date.now() / 1000
    );

  if (
    Math.abs(
      now - ts
    ) >
    CAREER_OS_REMOTE_ADMIN_MAX_SKEW_SECONDS
  ) {
    throw new Error(
      'Remote admin request expired.'
    );
  }

  const cache =
    CacheService
      .getScriptCache();

  const nonceKey =
    'career_os_admin_nonce_' +
    nonce;

  if (
    cache.get(
      nonceKey
    )
  ) {
    throw new Error(
      'Remote admin request replay rejected.'
    );
  }

  const canonical =
    CAREER_OS_REMOTE_ADMIN_VERSION +
    '|' +
    String(ts) +
    '|' +
    nonce +
    '|' +
    payload;

  const expected =
    careerOsRemoteAdminHex_(
      Utilities
        .computeHmacSha256Signature(
          canonical,
          sharedSecret
        )
    );

  if (
    !careerOsRemoteAdminConstantTimeEqual_(
      expected,
      signature
    )
  ) {
    throw new Error(
      'Remote admin authentication failed.'
    );
  }

  cache.put(
    nonceKey,
    '1',
    600
  );

  const decoded =
    Utilities
      .newBlob(
        Utilities
          .base64DecodeWebSafe(
            payload
          )
      )
      .getDataAsString();

  const command =
    JSON.parse(
      decoded
    );

  if (
    !command ||
    typeof command !== 'object'
  ) {
    throw new Error(
      'Remote admin command is invalid.'
    );
  }

  return command;
}

function careerOsRemoteAdminQueueState_() {
  const audioQueue =
    loadAudioQueue_();

  const imageQueue =
    loadImageQueue_();

  return {
    provider:
      careerOsGetAudioTranscriptionProvider_(),

    audio:
      (audioQueue || [])
        .map(function(job) {
          return {
            name:
              String(
                job &&
                job.name ||
                ''
              ),
            status:
              String(
                job &&
                job.status ||
                ''
              ),
            attempts:
              Number(
                job &&
                job.attempts ||
                0
              ),
            nextAttemptAt:
              Number(
                job &&
                job.nextAttemptAt ||
                0
              ),
            groqChunkIndex:
              Number(
                job &&
                job.groqChunkIndex ||
                0
              ),
            groqChunkStartSample:
              Number(
                job &&
                job.groqChunkStartSample ||
                0
              ),
            groqLastChunkMetrics:
              job &&
              job.groqLastChunkMetrics &&
              typeof job.groqLastChunkMetrics ===
                'object'
                ? job.groqLastChunkMetrics
                : null,
            lastError:
              String(
                job &&
                job.lastError ||
                ''
              )
                .substring(
                  0,
                  1000
                )
          };
        }),

    imageCount:
      (imageQueue || [])
        .length
  };
}

function careerOsRemoteAdminPropertyStatus_() {
  const props =
    careerOsRemoteAdminAssertStaging_();

  return {
    audioProvider:
      careerOsGetAudioTranscriptionProvider_(),

    hasGroqApiKey:
      Boolean(
        props.getProperty(
          'GROQ_API_KEY'
        )
      ),

    hasGeminiApiKey:
      Boolean(
        props.getProperty(
          'GEMINI_API_KEY'
        )
      ),

    hasAudioProxyBaseUrl:
      Boolean(
        props.getProperty(
          'CAREER_OS_AUDIO_PROXY_BASE_URL'
        )
      ),

    hasAudioProxySharedSecret:
      Boolean(
        props.getProperty(
          'CAREER_OS_AUDIO_PROXY_SHARED_SECRET'
        )
      ),

    liveProviderTestEnabled:
      String(
        props.getProperty(
          'CAREER_OS_STAGING_LIVE_PROVIDER_TEST'
        ) || ''
      )
        .trim()
        .toUpperCase() ===
        'ENABLED',

    hasTestFolderId:
      Boolean(
        props.getProperty(
          'CAREER_OS_STAGING_TEST_FOLDER_ID'
        )
      )
  };
}

function careerOsRemoteAdminSetProperties_(
  values
) {
  careerOsRemoteAdminAssertStaging_();

  if (
    !values ||
    typeof values !== 'object' ||
    Array.isArray(values)
  ) {
    throw new Error(
      'Property payload must be an object.'
    );
  }

  const keys =
    Object.keys(values);

  if (keys.length > 10) {
    throw new Error(
      'Too many property updates.'
    );
  }

  const allowed =
    {};

  CAREER_OS_REMOTE_ADMIN_PROPERTY_ALLOWLIST
    .forEach(function(key) {
      allowed[key] = true;
    });

  const sanitized =
    {};

  keys.forEach(
    function(key) {
      if (!allowed[key]) {
        throw new Error(
          'Property is not remote-admin approved: ' +
          key
        );
      }

      const value =
        String(
          values[key] === undefined ||
          values[key] === null
            ? ''
            : values[key]
        );

      if (value.length > 20000) {
        throw new Error(
          'Property value too large: ' +
          key
        );
      }

      sanitized[key] = value;
    }
  );

  PropertiesService
    .getScriptProperties()
    .setProperties(
      sanitized,
      false
    );

  return {
    changedKeys:
      keys.sort()
  };
}

function careerOsRemoteAdminSanitizedMetadataProbe_() {
  const raw =
    runCareerOsVnextStagingMetadataProbe();

  return {
    ok:
      Boolean(raw && raw.ok),
    environment:
      String(raw && raw.environment || ''),
    build:
      raw && raw.build || {},
    folderReadable:
      Boolean(raw && raw.folderReadable),
    fileCount:
      Number(raw && raw.fileCount || 0),
    files:
      (raw && raw.files || [])
        .map(function(file) {
          return {
            name:
              String(file && file.name || ''),
            mimeType:
              String(file && file.mimeType || ''),
            hasChecksum:
              Boolean(file && file.hasChecksum),
            parentCount:
              Number(file && file.parentCount || 0)
          };
        })
  };
}

function careerOsRemoteAdminBytesAscii_(
  bytes,
  start,
  length
) {
  return (bytes || [])
    .slice(
      start,
      start + length
    )
    .map(function(value) {
      const normalized =
        Number(value) < 0
          ? Number(value) + 256
          : Number(value);

      return (
        normalized >= 32 &&
        normalized <= 126
      )
        ? String.fromCharCode(
            normalized
          )
        : '.';
    })
    .join('');
}

function careerOsRemoteAdminClassifyAudioBytes_(
  bytes
) {
  const data =
    (bytes || [])
      .map(function(value) {
        return Number(value) < 0
          ? Number(value) + 256
          : Number(value);
      });

  const first4 =
    careerOsRemoteAdminBytesAscii_(
      data,
      0,
      4
    );

  const fourToEight =
    careerOsRemoteAdminBytesAscii_(
      data,
      4,
      4
    );

  if (
    data.length >= 12 &&
    fourToEight === 'ftyp'
  ) {
    return {
      container: 'iso-bmff',
      likelyFormat: 'mp4/m4a',
      brand:
        careerOsRemoteAdminBytesAscii_(
          data,
          8,
          4
        )
    };
  }

  if (
    data.length >= 3 &&
    first4.substring(0, 3) ===
      'ID3'
  ) {
    return {
      container: 'mpeg-audio',
      likelyFormat: 'mp3',
      brand: ''
    };
  }

  if (
    data.length >= 2 &&
    data[0] === 0xff &&
    (data[1] & 0xe0) === 0xe0
  ) {
    return {
      container: 'mpeg-audio',
      likelyFormat: 'mp3-or-adts',
      brand: ''
    };
  }

  if (
    data.length >= 12 &&
    first4 === 'RIFF' &&
    careerOsRemoteAdminBytesAscii_(
      data,
      8,
      4
    ) === 'WAVE'
  ) {
    return {
      container: 'riff',
      likelyFormat: 'wav',
      brand: ''
    };
  }

  if (first4 === 'fLaC') {
    return {
      container: 'flac',
      likelyFormat: 'flac',
      brand: ''
    };
  }

  if (first4 === 'OggS') {
    return {
      container: 'ogg',
      likelyFormat: 'ogg',
      brand: ''
    };
  }

  if (
    data.length >= 4 &&
    data[0] === 0x1a &&
    data[1] === 0x45 &&
    data[2] === 0xdf &&
    data[3] === 0xa3
  ) {
    return {
      container: 'ebml',
      likelyFormat: 'webm/matroska',
      brand: ''
    };
  }

  return {
    container: 'unknown',
    likelyFormat: 'unknown',
    brand: ''
  };
}

function careerOsRemoteAdminAudioFormatProbe_() {
  const props =
    careerOsRemoteAdminAssertStaging_();

  const folderId =
    String(
      props.getProperty(
        'CAREER_OS_STAGING_TEST_FOLDER_ID'
      ) || ''
    ).trim();

  if (!folderId) {
    throw new Error(
      'Staging test folder is not configured.'
    );
  }

  const result =
    Drive.Files.list(
      {
        q:
          "'" +
          folderId.replace(
            /'/g,
            "\\'"
          ) +
          "' in parents and trashed = false",
        pageSize: 100,
        fields:
          'files(id,name,mimeType,size)'
      }
    );

  const audioFiles =
    (result.files || [])
      .filter(function(file) {
        return /^audio\//i.test(
          String(
            file.mimeType ||
            ''
          )
        );
      });

  return {
    audio:
      audioFiles.map(
        function(file) {
          const bytes =
            readDriveByteRange_(
              file.id,
              0,
              63
            );

          const classified =
            careerOsRemoteAdminClassifyAudioBytes_(
              bytes
            );

          let chunkPlan = null;

          if (
            classified.container ===
              'iso-bmff' &&
            Number(
              file.size ||
              0
            ) >
              CAREER_OS_CONFIG
                .GROQ_FREE_TIER_MAX_FILE_BYTES
          ) {
            try {
              const parsed =
                careerOsM4aParseAudioTrack_(
                  file.id,
                  Number(
                    file.size ||
                    0
                  )
                );

              const selected =
                careerOsM4aSelectSamples_(
                  parsed,
                  0,
                  CAREER_OS_CONFIG
                    .GROQ_M4A_CHUNK_TARGET_MEDIA_BYTES
                );

              chunkPlan = {
                parserOk:
                  true,
                timescale:
                  parsed.timescale,
                sampleCount:
                  parsed.sampleCount,
                durationSeconds:
                  careerOsM4aTimeAtSample_(
                    parsed.sttsEntries,
                    parsed.sampleCount
                  ) /
                  parsed.timescale,
                sourceChunkCount:
                  parsed.chunkOffsets.length,
                firstChunkMediaBytes:
                  selected.mediaBytes,
                firstChunkSamples:
                  selected.sampleSizes.length,
                firstChunkSourceRangeCount:
                  selected.ranges.length,
                firstChunkSourceSpanBytes:
                  selected.ranges.length
                    ? selected.ranges[
                        selected.ranges.length - 1
                      ].endExclusive -
                      selected.ranges[0].start
                    : 0,
                firstChunkFinal:
                  selected.complete
              };
            } catch (error) {
              chunkPlan = {
                parserOk:
                  false,
                error:
                  String(
                    error &&
                    error.message ||
                    error
                  )
                    .substring(
                      0,
                      500
                    )
              };
            }
          }

          return {
            name:
              String(
                file.name ||
                ''
              ),
            mimeType:
              String(
                file.mimeType ||
                ''
              ),
            sizeBytes:
              Number(
                file.size ||
                0
              ),
            container:
              classified.container,
            likelyFormat:
              classified.likelyFormat,
            brand:
              classified.brand,
            chunkPlan:
              chunkPlan
          };
        }
      )
  };
}

function careerOsRemoteAdminSourceStatus_() {
  const props =
    careerOsRemoteAdminAssertStaging_();

  const folderId =
    String(
      props.getProperty(
        'CAREER_OS_STAGING_TEST_FOLDER_ID'
      ) || ''
    ).trim();

  if (!folderId) {
    throw new Error(
      'Staging test folder is not configured.'
    );
  }

  const result =
    Drive.Files.list(
      {
        q:
          "'" +
          folderId.replace(
            /'/g,
            "\\'"
          ) +
          "' in parents and trashed = false",
        pageSize: 100,
        fields:
          'files(id,name,mimeType,appProperties)'
      }
    );

  return {
    sources:
      (result.files || [])
        .filter(function(file) {
          return (
            /^audio\//i.test(
              String(
                file.mimeType ||
                ''
              )
            ) ||
            /^image\//i.test(
              String(
                file.mimeType ||
                ''
              )
            )
          );
        })
        .map(function(file) {
          const appProperties =
            file.appProperties ||
            {};

          return {
            name:
              String(
                file.name ||
                ''
              ),
            mimeType:
              String(
                file.mimeType ||
                ''
              ),
            audioStatus:
              String(
                appProperties
                  .careerOsAudioStatus ||
                ''
              ),
            audioLastError:
              String(
                appProperties
                  .careerOsAudioLastError ||
                ''
              )
                .substring(
                  0,
                  800
                ),
            imageStatus:
              String(
                appProperties
                  .careerOsImageStatus ||
                ''
              ),
            imageLastError:
              String(
                appProperties
                  .careerOsImageLastError ||
                ''
              )
                .substring(
                  0,
                  800
                )
          };
        })
  };
}

function careerOsRemoteAdminWorkspaceInventory_() {
  const props =
    careerOsRemoteAdminAssertStaging_();

  const folderId =
    String(
      props.getProperty(
        'CAREER_OS_STAGING_TEST_FOLDER_ID'
      ) || ''
    ).trim();

  if (!folderId) {
    throw new Error(
      'Staging test folder is not configured.'
    );
  }

  const sessionFolder =
    DriveApp.getFolderById(
      folderId
    );

  const workspaces =
    sessionFolder.getFoldersByName(
      CAREER_OS_CONFIG
        .SESSION_WORKSPACE_FOLDER
    );

  if (!workspaces.hasNext()) {
    return {
      workspacePresent: false,
      artifactCount: 0,
      artifacts: [],
      hasTranscriptArtifact: false
    };
  }

  const workspace =
    workspaces.next();

  const artifacts = [];
  const files =
    workspace.getFiles();

  while (files.hasNext()) {
    const file =
      files.next();

    let generated = false;
    let artifactType = '';

    try {
      const metadata =
        Drive.Files.get(
          file.getId(),
          {
            fields:
              'appProperties'
          }
        );

      const appProperties =
        metadata.appProperties ||
        {};

      generated =
        appProperties
          .careerOsGenerated ===
          'true';

      artifactType =
        String(
          appProperties
            .careerOsArtifactType ||
          ''
        );
    } catch (error) {
      generated = false;
    }

    artifacts.push(
      {
        name:
          file.getName(),
        mimeType:
          file.getMimeType(),
        size:
          Number(
            file.getSize() ||
            0
          ),
        modifiedUtc:
          file
            .getLastUpdated()
            .toISOString(),
        careerOsGenerated:
          generated,
        artifactType:
          artifactType
      }
    );
  }

  artifacts.sort(
    function(left, right) {
      return String(left.name)
        .localeCompare(
          String(right.name)
        );
    }
  );

  const hasTranscriptArtifact =
    artifacts.some(
      function(item) {
        return (
          item.careerOsGenerated &&
          /\.txt$/i.test(
            item.name
          ) &&
          /ACQC\s*L10/i.test(
            item.name
          )
        );
      }
    );

  return {
    workspacePresent: true,
    artifactCount:
      artifacts.length,
    artifacts:
      artifacts,
    hasTranscriptArtifact:
      hasTranscriptArtifact
  };
}

function careerOsRemoteAdminDispatch_(
  command
) {
  const action =
    String(
      command &&
      command.action ||
      ''
    );

  const params =
    command &&
    command.params &&
    typeof command.params === 'object'
      ? command.params
      : {};

  if (action === 'health') {
    return {
      version:
        CAREER_OS_REMOTE_ADMIN_VERSION,
      build:
        getCareerOsBuildInfo(),
      properties:
        careerOsRemoteAdminPropertyStatus_(),
      queues:
        careerOsRemoteAdminQueueState_()
    };
  }

  if (action === 'configProbe') {
    return {
      result:
        runCareerOsVnextStagingConfigProbe()
    };
  }

  if (action === 'proxyProbe') {
    return {
      result:
        runCareerOsVnextStagingAudioProxyProbe()
    };
  }

  if (action === 'metadataProbe') {
    return {
      result:
        careerOsRemoteAdminSanitizedMetadataProbe_()
    };
  }

  if (action === 'workspaceInventory') {
    return {
      result:
        careerOsRemoteAdminWorkspaceInventory_()
    };
  }

  if (action === 'sourceStatus') {
    return {
      result:
        careerOsRemoteAdminSourceStatus_()
    };
  }

  if (action === 'audioFormatProbe') {
    return {
      result:
        careerOsRemoteAdminAudioFormatProbe_()
    };
  }

  if (action === 'folderIngest') {
    return {
      result:
        runCareerOsVnextStagingFolderIngestProbe(),
      queues:
        careerOsRemoteAdminQueueState_()
    };
  }

  if (action === 'queueProbe') {
    return {
      result:
        runCareerOsVnextStagingLiveQueueProbe(),
      queues:
        careerOsRemoteAdminQueueState_()
    };
  }

  if (action === 'workerOnce') {
    const result =
      runCareerOsVnextStagingWorkerOnce();

    return {
      result:
        result,
      queues:
        careerOsRemoteAdminQueueState_()
    };
  }

  if (action === 'propertyStatus') {
    return {
      properties:
        careerOsRemoteAdminPropertyStatus_()
    };
  }

  if (action === 'setProperties') {
    return {
      result:
        careerOsRemoteAdminSetProperties_(
          params.values || {}
        ),
      properties:
        careerOsRemoteAdminPropertyStatus_()
    };
  }

  throw new Error(
    'Remote admin action is not allowed.'
  );
}

function doPost(e) {
  try {
    const raw =
      String(
        e &&
        e.postData &&
        e.postData.contents ||
        ''
      );

    if (
      !raw ||
      raw.length > 70000
    ) {
      throw new Error(
        'Remote admin request body is invalid.'
      );
    }

    const requestBody =
      JSON.parse(raw);

    const command =
      careerOsRemoteAdminAuthenticate_(
        requestBody
      );

    const result =
      careerOsRemoteAdminDispatch_(
        command
      );

    return careerOsRemoteAdminJson_(
      {
        version:
          CAREER_OS_REMOTE_ADMIN_VERSION,
        result:
          result
      }
    );
  } catch (error) {
    console.log(
      'REMOTE_ADMIN_REJECTED: ' +
      String(
        error &&
        error.message ||
        error
      )
    );

    return careerOsRemoteAdminJson_(
      {
        error:
          'request_rejected'
      },
      400
    );
  }
}
