function getCareerOsBuildInfo() {
  return JSON.parse(JSON.stringify(CAREER_OS_BUILD_INFO));
}

function careerOsVnextLooksLikeSessionLabel_(label) {
  const value = String(label || '').trim();
  if (!value) return false;

  return (
    /^\d{1,4}$/.test(value) ||
    /^[LRS]\s*[-_]?\s*\d{1,4}$/i.test(value) ||
    /^(?:session|lecture|chapter|week|block|unit|module)\s*[-_]?\s*\d{1,4}$/i.test(value)
  );
}

function careerOsVnextResolveContextLabel_(label) {
  if (careerOsVnextLooksLikeSessionLabel_(label)) {
    return {
      status: 'RESOLVED_PRIMARY',
      contextKind: 'session',
      method: 'session_label_rule'
    };
  }

  return {
    status: 'UNCLASSIFIED_AUTHORIZED',
    contextKind: 'unclassified',
    method: 'hold_not_discard'
  };
}

function careerOsVnextClassifySourceType_(mimeType, name) {
  const mime = String(mimeType || '').toLowerCase();
  const lower = String(name || '').toLowerCase();

  if (mime.indexOf('image/') === 0 || /\.(png|jpe?g|webp|heic|heif)$/i.test(lower)) return 'image';
  if (mime.indexOf('audio/') === 0 || /\.(m4a|mp3|wav|aac|flac|ogg)$/i.test(lower)) return 'audio';
  if (mime.indexOf('video/') === 0 || /\.(mp4|mov|mkv|webm)$/i.test(lower)) return 'video';
  if (mime === 'application/pdf' || /\.pdf$/i.test(lower)) return 'pdf';
  if (/presentation/.test(mime) || /\.(pptx?|odp)$/i.test(lower)) return 'presentation';
  if (mime.indexOf('text/') === 0 || /\.(txt|md|csv|json|ya?ml|js|ts|py)$/i.test(lower)) return 'text';
  if (/document|wordprocessingml/.test(mime) || /\.(docx?|odt)$/i.test(lower)) return 'document';

  return 'binary';
}

function runCareerOsVnextShadowSelfTest() {
  const checks = [];

  function add_(name, condition) {
    checks.push({
      name: name,
      ok: Boolean(condition)
    });
  }

  add_(
    'legacy_session_label',
    careerOsVnextResolveContextLabel_('L10').status === 'RESOLVED_PRIMARY'
  );

  add_(
    'arbitrary_context_is_held',
    careerOsVnextResolveContextLabel_('test').status === 'UNCLASSIFIED_AUTHORIZED'
  );

  add_(
    'audio_classification',
    careerOsVnextClassifySourceType_('audio/mpeg', 'sample.m4a') === 'audio'
  );

  add_(
    'heif_classification',
    careerOsVnextClassifySourceType_('image/heif', 'sample.HEIC') === 'image'
  );

  return {
    ok: checks.every(function(check) { return check.ok; }),
    build: getCareerOsBuildInfo(),
    checks: checks
  };
}
