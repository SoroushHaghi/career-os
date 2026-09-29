// TU Braunschweig KI-Toolbox text-provider adapter.
// Public endpoint contract is documented by GITZ. Credentials stay in Script Properties.
// Privacy rule: fail closed unless an upstream privacy gate explicitly attests that the
// payload is non-personal academic/technical material.

const CAREER_OS_TU_KI_TOOLBOX_ENDPOINT =
  'https://ki-toolbox.tu-braunschweig.de/api/v1/chat/send';

const CAREER_OS_TU_KI_TOOLBOX_MODELS = {
  'Qwen/Qwen3.8-27B': true,
  'openai/gpt-oss-120b': true,
  'mistralai/Magistral-Small-2509': true,
  'Qwen/Qwen2.5-Coder-32B-Instruct': true,
  'microsoft/phi-4': true,
  'gpt-5.6-luna': true,
  'gpt-5.6-terra': true,
  'gpt-6-astra': true
};

function careerOsTuKiToolboxToken_() {
  const token =
    String(
      PropertiesService
        .getScriptProperties()
        .getProperty(
          'TUBS_KI_TOOLBOX_API_TOKEN'
        ) ||
      ''
    ).trim();

  if (!token) {
    throw new Error(
      'TU KI-Toolbox API token is not configured.'
    );
  }

  return token;
}

function careerOsTuKiToolboxAssertRequest_(
  request
) {
  if (
    !request ||
    request.privacyApproved !== true ||
    request.privacyClass !==
      'academic_non_personal'
  ) {
    throw new Error(
      'TU KI-Toolbox request blocked by privacy gate.'
    );
  }

  const model =
    String(
      request.model ||
      ''
    ).trim();

  if (
    !CAREER_OS_TU_KI_TOOLBOX_MODELS[
      model
    ]
  ) {
    throw new Error(
      'TU KI-Toolbox model is not approved: ' +
      model
    );
  }

  const prompt =
    String(
      request.prompt ||
      ''
    );

  if (
    !prompt.trim() ||
    prompt.length > 120000
  ) {
    throw new Error(
      'TU KI-Toolbox prompt is empty or exceeds the bounded request size.'
    );
  }

  return {
    model:
      model,
    prompt:
      prompt,
    customInstructions:
      String(
        request.customInstructions ||
        ''
      ),
    hideCustomInstructions:
      request.hideCustomInstructions !==
      false
  };
}

function careerOsTuKiToolboxParseResponse_(
  responseText
) {
  const text =
    String(
      responseText ||
      ''
    );

  const lines =
    text
      .split(/\r?\n/)
      .map(function(line) {
        return line.trim();
      })
      .filter(Boolean);

  let done = null;

  lines.forEach(
    function(line) {
      let parsed;

      try {
        parsed =
          JSON.parse(
            line
          );
      } catch (error) {
        return;
      }

      if (
        parsed &&
        parsed.type === 'done'
      ) {
        done = parsed;
      }
    }
  );

  if (!done) {
    // Some deployments may return one JSON object without line breaks.
    try {
      const parsed =
        JSON.parse(
          text
        );

      if (
        parsed &&
        parsed.type === 'done'
      ) {
        done = parsed;
      }
    } catch (error) {
      // Fail below with a stable error.
    }
  }

  if (!done) {
    throw new Error(
      'TU KI-Toolbox response did not contain a done event.'
    );
  }

  return {
    text:
      String(
        done.response ||
        ''
      ),
    rawType:
      'done'
  };
}

function careerOsTuKiToolboxRateHeaders_(
  headers
) {
  const safe = {};

  Object.keys(
    headers || {}
  ).forEach(
    function(key) {
      const lower =
        String(key)
          .toLowerCase();

      if (
        lower.indexOf('rate') >= 0 ||
        lower.indexOf('limit') >= 0 ||
        lower === 'retry-after'
      ) {
        safe[key] =
          String(
            headers[key]
          )
            .substring(
              0,
              500
            );
      }
    }
  );

  return safe;
}

function careerOsTuKiToolboxCall_(
  request
) {
  const normalized =
    careerOsTuKiToolboxAssertRequest_(
      request
    );

  const token =
    careerOsTuKiToolboxToken_();

  const body = {
    thread: null,
    prompt:
      normalized.prompt,
    model:
      normalized.model,
    customInstructions:
      normalized.customInstructions,
    hideCustomInstructions:
      normalized.hideCustomInstructions
  };

  const startedAt =
    Date.now();

  const response =
    UrlFetchApp.fetch(
      CAREER_OS_TU_KI_TOOLBOX_ENDPOINT,
      {
        method:
          'post',
        headers: {
          Accept:
            'application/json',
          Authorization:
            'Bearer ' +
            token
        },
        contentType:
          'application/json',
        payload:
          JSON.stringify(
            body
          ),
        muteHttpExceptions:
          true
      }
    );

  const status =
    Number(
      response.getResponseCode()
    );

  const durationMs =
    Date.now() -
    startedAt;

  const rateHeaders =
    careerOsTuKiToolboxRateHeaders_(
      response.getAllHeaders()
    );

  if (
    status < 200 ||
    status >= 300
  ) {
    const error =
      new Error(
        'TU KI-Toolbox HTTP ' +
        status
      );

    error.providerStatus =
      status;
    error.retryAfter =
      rateHeaders['Retry-After'] ||
      rateHeaders['retry-after'] ||
      '';

    throw error;
  }

  const parsed =
    careerOsTuKiToolboxParseResponse_(
      response.getContentText()
    );

  return {
    text:
      parsed.text,
    provider:
      'tubs_ki_toolbox',
    model:
      normalized.model,
    method:
      'tu_text_reasoning_v1',
    durationMs:
      durationMs,
    status:
      status,
    rateHeaders:
      rateHeaders
  };
}

function careerOsTuKiToolboxProbe_(
  model
) {
  const marker =
    'CAREER_OS_TU_PROBE_OK';

  try {
    const result =
      careerOsTuKiToolboxCall_(
        {
          model:
            String(
              model ||
              'Qwen/Qwen3.8-27B'
            ),
          prompt:
            'This is a non-personal technical API health check. ' +
            'Return exactly ' +
            marker +
            ' and nothing else.',
          customInstructions:
            'Return exactly the requested marker. Do not add explanation.',
          hideCustomInstructions:
            true,
          privacyApproved:
            true,
          privacyClass:
            'academic_non_personal'
        }
      );

    return {
      ok:
        result.text
          .indexOf(
            marker
          ) >= 0,
      provider:
        result.provider,
      model:
        result.model,
      status:
        result.status,
      durationMs:
        result.durationMs,
      responseChars:
        result.text.length,
      rateHeaders:
        result.rateHeaders
    };
  } catch (error) {
    return {
      ok:
        false,
      model:
        String(
          model ||
          'Qwen/Qwen3.8-27B'
        ),
      status:
        Number(
          error &&
          error.providerStatus ||
          0
        ),
      retryAfter:
        String(
          error &&
          error.retryAfter ||
          ''
        ),
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
