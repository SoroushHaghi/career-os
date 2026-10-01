export function normalizeEvidenceBasename(filename) {
  return String(filename ?? '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/(?:[\s._-]+)(?:career[\s._-]*os)$/i, '')
    .replace(/(?:[\s._-]+)(?:transcript|transcription)$/i, '')
    .replace(/[\s._-]+/g, ' ')
    .trim();
}

export function looksLikeTranscriptText({ text = '', filename = '' }) {
  const value = String(text);
  if (value.length < 500) return false;
  if (/\[\d{2}:\d{2}(?::\d{2})?\]/.test(value)) return true;
  if (/\b(lecturer|speaker\s*\d*|student|professor|teacher)\s*:/i.test(value)) return true;
  if (/\b(summary|notes?|outline|flashcards?)\b/i.test(String(filename).toLowerCase())) return false;
  return value.length >= 2000;
}

export function transcriptMatchDecision({
  sourceId,
  sourceName,
  sourceFingerprint,
  candidate,
  previousLink = null,
}) {
  if (!candidate || !/\.txt$/i.test(String(candidate.name ?? ''))) {
    return { match: false, reason: 'not_text_candidate' };
  }

  const props = candidate.appProperties ?? {};
  if (
    props.careerOsSourceId === String(sourceId) &&
    props.careerOsSourceFingerprint &&
    props.careerOsSourceFingerprint === String(sourceFingerprint)
  ) {
    return { match: true, reason: 'explicit_source_fingerprint' };
  }

  const head = String(candidate.text ?? '').slice(0, 8000);
  if (
    head.includes('source_drive_id: ' + String(sourceId)) &&
    head.includes('source_content_fingerprint: ' + String(sourceFingerprint))
  ) {
    return { match: true, reason: 'portable_header_fingerprint' };
  }

  if (/\b(summary|notes?|outline|flashcards?)\b/i.test(String(candidate.name).toLowerCase())) {
    return { match: false, reason: 'summary_or_notes' };
  }

  const sameBase =
    normalizeEvidenceBasename(candidate.name) === normalizeEvidenceBasename(sourceName);
  if (!sameBase || !looksLikeTranscriptText(candidate)) {
    return { match: false, reason: 'weak_external_candidate' };
  }

  if (
    previousLink &&
    String(candidate.id) === String(previousLink.transcriptId) &&
    previousLink.audioFingerprint &&
    String(previousLink.audioFingerprint) !== String(sourceFingerprint) &&
    previousLink.transcriptFingerprint &&
    String(candidate.fingerprint) === String(previousLink.transcriptFingerprint)
  ) {
    return { match: false, reason: 'stale_external_transcript' };
  }

  return { match: true, reason: 'credible_external_transcript' };
}
