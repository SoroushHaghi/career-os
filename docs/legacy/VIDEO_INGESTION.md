# Video Ingestion Architecture

Status: TARGET ARCHITECTURE / v1
Updated: 2026-09-26

## Goal

Convert approved video sources into reusable text-first evidence while preserving important visual information and timestamps.

## Target outputs

For one source video, Career OS should produce:

- `VIDEO_TRANSCRIPT.md` — source-faithful speech transcript;
- `VIDEO_TIMELINE.json` — timestamped semantic/visual events;
- `VIDEO_VISUAL_NOTES.md` — OCR/description of salient visual moments;
- `VIDEO_NOTES.md` — merged chronological notes grounded in transcript + visuals;
- `SEMANTIC_PROFILE.json` — compact retrieval index;
- provenance linking every artifact to source ID/version and processing versions.

## Recommended dual-path processing

```text
video source
   |
   +--> audio extraction --> dedicated speech-to-text --> transcript
   |
   +--> direct video understanding --> salient scenes / visual timeline
                                      |
                                      +--> key frames/slides --> OCR/visual text
   |
   +--> chronological merge --> VIDEO_NOTES
                          --> semantic profile
                          --> promotion candidates
```

The transcript and visual analysis are separate evidence channels. Their merge must retain timestamps and indicate whether a statement comes from speech, on-screen text, or visual inference.

## Provider strategy

Current preferred provider routing:
- speech transcript: Gemini 3.5 Transcribe, verbatim;
- direct video understanding: Gemini 3.8 Flash;
- long-form video understanding: agentic video processing;
- salient frame OCR/visual reading: Gemini 3.8 Flash at higher media resolution when fine text matters.

Provider IDs are adapters, not architecture.

## Long-form strategy

Do not statically inspect every frame at maximum resolution by default.

For long videos:
1. create/obtain a high-quality transcript;
2. use agentic video understanding to find important visual segments and timestamps;
3. inspect selected segments/frames at higher detail;
4. merge with transcript into a timeline.

This reduces unnecessary media tokens while retaining important visual evidence.

## Media worker requirement

High-quality video preprocessing benefits from tools such as FFmpeg for:
- extracting the audio track;
- probing duration/codecs;
- extracting exact keyframes at salient timestamps;
- optional clip slicing.

Apps Script remains suitable as a Drive event adapter but is not the preferred long-term heavy media worker. Heavy video processing should execute in a container/background worker with resumable job state.

## Failure and fallback

If audio extraction/dedicated STT is unavailable:
- direct Gemini video understanding may create a usable transcript/timeline fallback;
- mark the extraction method explicitly;
- do not silently label a model-generated summary as a verbatim transcript.

If visual analysis fails:
- preserve transcript and mark visual enrichment incomplete.

Every partial result remains usable and retryable.
