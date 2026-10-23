# Processing identity

Freshness and queue keys use the complete tuple: sourceVersionKey, processorName,
processorVersion, processingProfileVersion. Missing fields are incompatible, not
implicitly version 1. The shared pure implementation is bundled into Apps Script.

Runtime descriptors live in 00_config/20_processing_identity.gs. Bump only the
changed processor version for implementation changes or its profile version for
material prompt/schema changes. Package planners accept processingProfileVersions
by processor name. Unrelated processors retain their keys and reusable outputs.

Image, PDF and audio sidecars persist this identity in their portable headers and
Drive appProperties; registry artifact/evidence projections preserve it. Runtime
sourceVersionKey encodes source ID plus fingerprint. Legacy artifacts regenerate
once on normal processing; metadata is never upgraded without executing the
processor. Existing manual audio transcripts keep their separate matching rules.

Version changes reset incompatible queued retry/chunk state. Fingerprint-only
cross-source cache reuse is disabled because it cannot establish processor or
source-context compatibility. No production scanner is enabled by this migration.
