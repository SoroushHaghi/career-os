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
        runCareerOsVnextStagingMetadataProbe()
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
