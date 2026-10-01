# Manual Knowledge Compiler staging runtime

This staging-only path consumes the shared package-level Knowledge Compiler contracts.
It does not add scanner hooks, queue workers, permanent triggers, production deployment,
or automatic promotion.

## Private Script Properties

Required:

- `CAREER_OS_ENVIRONMENT=staging`
- `CAREER_OS_STAGING_LIVE_PROVIDER_TEST=ENABLED`
- `CAREER_OS_STAGING_TEST_FOLDER_ID=<session Drive folder ID>`
- `CAREER_OS_KNOWLEDGE_PROVIDER=gemini` (default)
- `CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL=<explicit free-approved model>`
- existing `GEMINI_API_KEY`

Optional:

- `CAREER_OS_KNOWLEDGE_VERIFICATION=ENABLED|DISABLED` (default: ENABLED)
- `CAREER_OS_KNOWLEDGE_VERIFICATION_MODEL=<free-approved model>`
  (defaults to the synthesis model)

The synthesis and verification models must already exist in
`CAREER_OS_CONFIG.FREE_TIER_GEMINI_MODELS`. The adapter cannot expand the
allowlist or bypass `FREE_ONLY_MODE`.

## Manual invocation

After deployment to staging:

`runKnowledgeCompilerStaging()`

or:

`runKnowledgeCompilerForContext('<session Drive folder ID>')`

The context must be explicitly staging-authorized and must already contain
`_AI_WORKSPACE`.

## Runtime flow

```text
existing text artifacts
  -> bounded evidence bundle
  -> shared session synthesis prompt/schema
  -> Gemini structured synthesis
  -> deterministic structural/evidence validation
  -> deterministic quality gate
  -> selective topic verification (second call, when enabled)
  -> SESSION_SYNTHESIS.md + SESSION_SYNTHESIS.json
```

The synthesis output is concept-oriented rather than a raw concatenation. It supports:

- title and executive summary;
- topic blocks;
- definitions;
- formulas;
- examples;
- lecturer emphasis;
- evidence references;
- uncertainties;
- conflicts;
- coverage.

Selective verification checks each synthesized topic only against its cited evidence.
A verification provider failure does **not** destroy an otherwise valid synthesis; the
artifact is published with `VERIFICATION_FAILED` and review required.

## Evidence limits

The manual compiler reads directly contained text/Markdown artifacts only.
Raw media extraction is outside this stage.

Current bounds:

- 200 discovered workspace files;
- 40 evidence artifacts;
- 512 KB per file;
- 4 MB aggregate reads;
- 16,000 characters per artifact;
- 60,000 selected evidence characters;
- 120,000 serialized provider-request characters.

Truncation and exclusions are explicit in output metadata.

Generated knowledge outputs including `SESSION_SYNTHESIS*`,
`SESSION_VERIFICATION*`, and `COURSE_KNOWLEDGE*` are excluded from the
next session compilation. Compiler-owned files are also excluded by appProperties.

## Outputs

Same `_AI_WORKSPACE`:

- `SESSION_SYNTHESIS.md` — human-readable structured knowledge artifact plus
  quality and verification state.
- `SESSION_SYNTHESIS.json` — machine-readable synthesis, evidence lineage,
  provider/model identity, quality metrics, selective-verification verdicts,
  coverage and exclusions.

Evidence bodies are not duplicated in the JSON companion.

Outputs are never automatically promotable in this staging slice.
`main` and production remain unaffected.
