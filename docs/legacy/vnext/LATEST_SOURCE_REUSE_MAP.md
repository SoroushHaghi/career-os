# Latest Apps Script Source — Reuse Map

Status: ACTIVE MIGRATION MAP
Updated: 2026-09-27

## Purpose

Record which behaviors from the latest supplied Apps Script source are retained in Career OS vNext, which are wrapped behind architecture boundaries, and which are intentionally superseded.

The supplied source is a compatibility/evidence baseline, not the target architecture.

## Source comparison result

The latest supplied source and the current `vnext` repository baseline expose the same 120 top-level functions.

Observed differences are intentional:
- one functional correction in `enqueueImageJob_`: vNext uses the image-status helper rather than the audio-status helper;
- four public-safety comment/example substitutions replacing user-specific course labels with generic examples.

No unique functional routine from the supplied source is missing from the repository baseline.

## Reuse decisions

| Legacy behavior | vNext decision | Owner |
| --- | --- | --- |
| Drive Changes scanner/page token | REUSE | drive-adapter/runtime |
| Scanner separated from heavy worker | REUSE | runtime |
| Drive File ID as source identity | REUSE | core + drive-adapter |
| Content checksum as source version | REUSE + EXPAND | drive-adapter |
| MD5 -> SHA-256 -> SHA-1 -> conservative fallback | REUSE | drive-adapter |
| Script lock / serialized queue mutations | REUSE | runtime |
| Image/audio durable queues | REUSE BEHIND JOB CONTRACT | processing/runtime |
| Duplicate suppression by source/version | REUSE | processing |
| Retry-After + exponential backoff + shared provider cooldown | REUSE BEHIND NORMALIZED ERROR POLICY | processing/runtime |
| Exact generated-artifact reuse | REUSE | processing + Drive artifact store |
| Existing credible transcript association | REUSE | processing |
| Resumable Gemini audio upload + Drive range read | REUSE IN DRIVE/PROVIDER ADAPTER | drive-adapter/provider runtime |
| Gemini temporary-file cleanup | REUSE | provider adapter |
| Source-faithful image OCR | REUSE | image processor |
| Verbatim transcription + separate navigation index | REUSE | audio processor |
| PDF deterministic Drive conversion before Gemini fallback | REUSE | document processor |
| Safe generated sidecar ownership | REUSE | Drive artifact store |
| `_AI_WORKSPACE` | REUSE AS ACTIVE ARTIFACT STORE | Drive artifact store |
| Portable artifact metadata header | KEEP AS COMPATIBILITY PROJECTION | persistence/artifact projection |
| `SESSION_MANIFEST.md` | KEEP AS HUMAN-READABLE PROJECTION | persistence |
| appProperties for compact ownership/status/provenance | REUSE, KEEP SMALL | drive-adapter |
| Free-only provider/model guard | REUSE AS RUNTIME POLICY | processing/runtime |
| Folder-name/session regex as hard eligibility gate | SUPERSEDE | Context Resolver |
| `NON_SESSION_SOURCE_IGNORED` for authorized evidence | REMOVE FROM TARGET FLOW | Context Resolver/intake |
| Folder names as canonical context identity | REJECT | core |
| Automatic relocation of arbitrary user TXT sources | DO NOT MAKE DEFAULT | Drive artifact-store policy |
| Drive connector directly deciding Gemini behavior | DECOUPLE | connector -> processor/provider |
| Processor code directly promoting Career Memory truth | FORBIDDEN | promotion boundary |
| Full semantic payloads in appProperties | FORBIDDEN | persistence boundary |

## Important intentional correction: context

The legacy runtime treats session-like folder names as a hard processing gate.

vNext instead treats:
- folder ID as stable context identity;
- folder label/regex as a context hint;
- authorized unresolved material as `UNCLASSIFIED_AUTHORIZED`.

Therefore arbitrary authorized contexts such as a folder named `test` are registered/held rather than silently discarded.

## Important intentional correction: source version

The useful legacy hierarchy is retained:

```text
MD5
-> SHA-256
-> SHA-1
-> folder ID for folders
-> native revision/metadata fallback for Google-native files
-> size + modifiedTime conservative fallback
```

The Drive adapter owns these provider-native details. Core only sees stable source/version contracts.

## Provider policy

The supplied provider/model routing is retained as milestone-1 runtime policy, not domain truth.

Current baseline roles:
- image/document visual extraction -> current Gemini Flash path;
- canonical audio transcript -> dedicated transcription path;
- audio navigation/fallback -> general multimodal Flash path.

Exact model IDs are configuration/provenance and can change without changing core entities.

## Migration rule

Do not copy legacy functions into new packages merely because they work.

For each legacy function:
1. preserve behavior with characterization tests;
2. move provider/source-specific mechanics behind the correct adapter;
3. keep source-faithful artifacts separate from semantic inference;
4. preserve idempotency/provenance;
5. remove only after repo-built runtime parity is proven.

Production remains unchanged until staging parity and rollback checks pass.
