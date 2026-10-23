# Cross-session knowledge consolidation

Status: package-level implementation; no live provider, persistence, trigger, or promotion.

## Contract and invocation

Import directly from `packages/knowledge/src/cross-session.mjs` and
`packages/knowledge/src/course-renderer.mjs`. No existing runtime or session-core
module needs to import these files until integration is explicitly implemented.

```js
import {
  buildCourseConsolidationRequest,
  consolidateCourseKnowledge,
} from '../../packages/knowledge/src/cross-session.mjs';
import { createCourseKnowledgeArtifacts } from '../../packages/knowledge/src/course-renderer.mjs';

const options = {
  course: { courseId: 'synthetic-course', title: 'Synthetic Course' },
  sessions: [{
    sessionId: 'synthetic-session-1',
    synthesisVersion: 'synthesis-v1',
    verificationStatus: 'UNVERIFIED',
    evidence: [{ evidenceId: 'synthetic-e1', sourceVersionKey: 'source-v1' }],
    synthesis: {
      title: 'Synthetic Session',
      topicBlocks: [{
        title: 'Synthetic concept',
        explanation: 'A source-linked synthetic explanation.',
        evidenceRefs: ['synthetic-e1'],
        definitions: [], formulas: [], examples: [], lecturerEmphasis: [],
        uncertainties: [],
      }],
      uncertainties: [], conflicts: [], coverage: { summary: 'Synthetic fixture' },
    },
  }],
  previous: null, // or the complete previous COURSE_KNOWLEDGE.json
};
const course = consolidateCourseKnowledge(options);
const artifacts = createCourseKnowledgeArtifacts(course);
// Descriptors only: caller persists artifacts[0/1].content in approved private storage.
```

`contextId` aliases `sessionId`; `synthesisId` aliases `synthesisVersion`.
The synthesis object accepts the current compiler's `topicBlocks` / `topic_blocks`,
`evidenceRefs` / `evidence_refs`, and `lecturerEmphasis` / `lecturer_emphasis`.
Every normalized input must have a nonempty immutable synthesis version/ID, at least one
nonempty title/explanation, and a session identity. A session reference alone is
allowed, but produces `SESSION_REPORTED`, never invented evidence links. An
optional evidence inventory restricts all cited refs and retains source version,
anchor and modality. Evidence bodies are not retained or sent to consolidation.
For current runtime `schemaVersion: 0.2` companions, call
`sessionSynthesisToCourseInput(companion)` first. This helper derives the missing
synthesis version from normalized content, evidence lineage, quality and verification
metadata. Volatile timestamps/timings are excluded; bundle ID alone is never used as
the synthesis identity. An explicit `{ synthesisVersion }` override is also supported.
Selective topic verdicts and qualifications are retained in detail lineage and
uncertainty, including negative verdicts and verifier warnings.

Partial publication fails closed. Verification metadata is retained per source;
consolidation never creates a verification pass.

Topic detail fields accept strings or `{ text, evidenceRefs?, origin?,
supportStatus?, uncertainties?, claimKey?, scope? }` objects. `claimKey` plus `scope`
explicitly identifies comparable claims. Different text in such a slot creates an
OPEN competing-claims review item, not an assertion of a logical contradiction.
Topic-wide `origin`/`supportStatus` are inherited unless a detail specifies them.
Origins are `SOURCE_LINKED`, `SESSION_REPORTED`, `INFERENCE`, `EXTERNAL_RESEARCH`.
Source-linked means a synthesis cited evidence; it does not mean independently
verified. Explicit inference never becomes source-supported through repetition.

## Semantic reconciliation

Exact normalized concept keys/titles and exact case-sensitive detail text merge
without a provider. This is conservative lexical reconciliation, not a claim to
understand arbitrary synonyms or contradictions. For those, use one bounded
provider-agnostic request:

```js
const request = buildCourseConsolidationRequest({ ...options, maxChars: 120000 });
// Call an existing authorized provider adapter outside this package.
// Apply privacy/free-only/model gates to the exact outbound request as usual.
// const response = await authorizedAdapter(request);
// const result = consolidateCourseKnowledge({ ...options, reconciliation: response });
```

Response schema is exposed as `COURSE_CONSOLIDATION_RESPONSE_SCHEMA`:

- `requestId`: must match the exact prepared snapshot and prior decisions.
- `groups`: `{ canonicalKey, topicRefs[] }`; every supplied topic occurs exactly once.
- `equivalences`: `{ detailRefs[] }`; at least two details, same concept, kind,
  origin, support status, uncertainty, claim key and scope. All original wording
  variants and provenance remain; the model cannot replace source statements.
- `conflicts`: `{ detailRefs[], description }`; both sides retained, OPEN,
  model-detected relation explicitly `INFERENCE`.
- `inferences`: `{ topicRefs[], text }`; separate unverified cross-session additions.

Unknown refs, omissions, duplicate topic assignment, stale request IDs, attempted
splitting of established concepts, and conflict-erasing deduplication fail closed.
The complete serialized request (instructions/schema included) must fit the bound;
no statement, qualifier, session or conflict is silently truncated. Response size
is bounded as well. Oversize scopes require a deliberately smaller module scope;
this package does not create an orchestration platform or auto-batch away context.
The request contains structured synthesis only; it still inherits source privacy.

## Output and incremental behavior

`consolidateCourseKnowledge` returns a JSON-serializable course snapshot with:

- `course`, `consolidationVersion`, deterministic `revisionId`;
- `concepts[]`: stable IDs/keys, title/aliases, representative explanation,
  details, definition/formula/example/emphasis detail IDs, source sessions,
  `additionsBySession`, uncertainties, conflicts, unresolved questions;
- each detail: source wording variants, origin/support/scope/uncertainty, and
  per-session/version/topic/detail/evidence lineage plus source verification;
- course-wide conflicts, uncertainties, unresolved questions and separate inference;
- coverage, source coverage/exclusions and explicit conflict-detection limitations;
- `sessions`: versioned normalized structured inputs (no raw evidence bodies), and
  `decisions`: reconciliation decisions needed for deterministic incremental replay;
- `conceptRedirects` when a later reconciliation unifies two existing concepts;
- `generated: true`, `artifactType: course_knowledge`, `UNVERIFIED`, and no promotion.

Pass the entire previous output back as `previous` and only new/repeated sessions
as `sessions`. Unchanged session/version reruns produce identical JSON, revision
and Markdown. Reusing a session/version for changed content is rejected. New
versions are appended, never silently treated as authoritative corrections; both
versions, qualifiers and conflicts remain visible. Version strings are opaque,
not chronological authority. There is no supersession or retraction operation.

Fresh builds are independent of input session order. Incremental builds preserve
existing concept/detail order and IDs, append new concepts deterministically, and
keep prior representative wording. Full rebuild ordering can differ from a historic
incremental build: supply `previous` to preserve that history. Semantic merges keep
the first existing concept's ID and redirect retired IDs to it. A representative
explanation is a stable display choice, **not conflict resolution**. Consumers must
read alternatives and warnings; the Markdown renderer does so explicitly.

Global session uncertainty is conservatively carried onto all its details so an
unanchored ASR warning cannot disappear during deduplication. This may retain more
separate variants than a human would; relaxing it requires independently supported
verification, outside this task.

`createCourseKnowledgeArtifacts` returns two descriptors:
`COURSE_KNOWLEDGE.md` and `COURSE_KNOWLEDGE.json`. Both are generated artifacts;
the existing session compiler selector self-excludes them by metadata and filename.
The consolidator itself rejects course artifacts used as session input. Persistence
is a caller responsibility; no filesystem/Drive/provider/network call occurs here.

## Integration dependency

The latest staging runtime now publishes `topicBlocks` companions. The pure
`sessionSynthesisToCourseInput` helper accepts those complete companions without
changes to runtime modules. The older enrichment-shaped `synthesis.topics` remains
intentionally rejected rather than silently dropping content. Remaining integration
work is a staging caller for private multi-session discovery, helper invocation,
optional authorized semantic provider call and private output persistence. That
caller owns privacy/free-only policy and provider configuration; this package makes
no live call. This PR does not touch runtime workers, compiler/quality/verifier code,
main or production.

## Validation

Synthetic tests cover three-session merging, detail lineage, immutable versions,
idempotence, source and semantic conflicts, uncertainty, inference boundaries,
reference survival, stable IDs/order/redirects, generated-artifact exclusion,
malformed semantic responses, explicit bounds and compatibility with the current
session compiler's normalized and response-style topic contracts. Run:

```sh
node --test tests/cross-session-knowledge.test.mjs
npm test
```
