# Manual Knowledge Compiler runtime integration

This adapter consumes the current `packages/knowledge/src/enrichment.mjs` API;
it does not modify compiler core, benchmarks or schemas. It is bundled only in
the staging profile. No scanner, worker, trigger, dashboard or promotion hook is added.

## Private Script Properties

- `CAREER_OS_ENVIRONMENT=staging`
- `CAREER_OS_STAGING_LIVE_PROVIDER_TEST=ENABLED`
- `CAREER_OS_STAGING_TEST_FOLDER_ID=<session Drive folder ID>`
- `CAREER_OS_KNOWLEDGE_PROVIDER=gemini` (default)
- `CAREER_OS_KNOWLEDGE_SYNTHESIS_MODEL=<explicit approved model>` (required; no extraction default)
- Existing `GEMINI_API_KEY` remains in the runtime secret store.

Additional contexts can be explicitly authorized in the existing
`CAREER_OS_VNEXT_ALLOWED_CONTEXT_IDS` property. The model must already appear in
`CAREER_OS_CONFIG.FREE_TIER_GEMINI_MODELS`; this adapter cannot extend that list
or bypass the existing free-only checks. The existing billing-disabled policy
still applies. Unsupported, unset or disallowed model configuration blocks execution.

After the branch is deployed to **staging** through the existing authorized
deployment process, invoke `runKnowledgeCompilerStaging()` in Apps Script, or
call `runKnowledgeCompilerForContext('<session Drive folder ID>')` from a private
manual wrapper. This feature adds no remote-admin API or permanent trigger.

The context must contain an existing `_AI_WORKSPACE`. Only directly contained
plain-text/Markdown evidence is read; no raw media is extracted and no nested or
other-context folder is searched. Supported portable types include transcript,
OCR/semantic image text and extracted PDF text; ungenerated `.txt`/`.md` notes
are accepted. Operational/generated non-evidence files are excluded.

Packing is deterministic by artifact ID, bounded to 200 discovered files,
40 evidence artifacts, 512 KB/file, 4 MB aggregate reads, 16,000 characters per
artifact and 60,000 total body characters. Full serialized provider requests
are additionally capped at 100,000 characters. Prefix truncation is explicit;
anchors refer to UTF-16 character ranges in the stripped artifact body, whose
existing page/timestamp text is preserved. Coverage is **existing text only**,
not a claim that session ingestion is complete. Missing source media is not synthesized.

One Gemini `generateContent` request uses JSON response mode; there is no paid
fallback, automatic retry, or second verification call. The existing enrichment
normalizer and evidence-ref validator validate the returned topics/relations/
conflicts. Unknown refs, missing topics, blocked/truncated or malformed responses
produce no output. This is runtime wiring for the existing enrichment API, not
the parallel worker's new compiler output schema or quality benchmark.

Outputs in that same workspace:

- `SESSION_SYNTHESIS.md`: derived topics, evidence references, conflicts/warnings,
  coverage and exclusions.
- `SESSION_SYNTHESIS.json`: structured synthesis, provenance, model, runtime SHA,
  coverage and exclusions. Evidence bodies are not duplicated in the companion.

Both are marked `UNVERIFIED`, never automatically promotable. Outputs and renamed
synthesis artifacts cannot feed into the next run. Existing user-owned names are
preserved by failing before the provider call. Reruns update only outputs with
matching compiler/context ownership. Drive has no atomic two-file write: JSON
starts as `publicationStatus=PARTIAL` and becomes `COMPLETE` only after Markdown
is written; consumers must check that state and compare the generation timestamp.
An interrupted publication is repairable by rerunning the manual entrypoint.

No live private context, secret, paid API call, production deployment or main
merge is required for synthetic integration tests. A real staging acceptance
still requires staging deployment, approved model configuration and one authorized
session containing text evidence.
