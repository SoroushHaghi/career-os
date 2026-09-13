# Privacy Policy

Career OS is designed so the reusable system repository can be made public without exposing user data.

## Never store in `career-os`

- real private contact details or addresses;
- passwords, API keys, tokens, recovery codes, private keys, or `.env` contents;
- student/employee/tax/bank/passport/residence identifiers;
- raw private CV/resume files, contracts, identity documents, transcripts, certificates, medical or financial documents;
- raw private audio/video/images/PDFs or extracted personal transcripts;
- real Drive file/folder IDs from private workspaces;
- Script Properties dumps, queue contents, provider upload URLs, or other runtime state tied to a real user;
- personal filesystem paths/usernames when they expose private structure;
- real private-memory exports.

## Allowed in `career-os`

- generic architecture and documentation;
- reusable automation specifications;
- privacy and validation rules;
- reusable scripts/tests only when they contain no secrets or private runtime state;
- synthetic examples and placeholder IDs;
- non-personal sample manifests/workspaces.

## Private repository boundary

`career-memory` is private and may contain sanitized durable user-specific state according to its own policy. It is still not a default warehouse for raw sensitive source documents or credentials.

A protected internal code snapshot may live in the private repository when it contains no embedded credentials or private source content.

## Cloud-ingestion privacy

The ingestion architecture may use cloud services for OCR/transcription/document extraction, but detection scope and AI-processing scope are separate concepts.

A Drive-wide change scanner must not be interpreted as blanket permission to send every changed Drive file to an AI provider.

Implementation requirements:
- provider credentials live in approved secret/configuration storage outside Git;
- provider choice remains replaceable;
- privacy terms, retention, quotas, and pricing should be checked before enabling a provider;
- highly sensitive material should be excluded from cloud AI processing unless explicitly permitted by policy/user scope;
- raw source files and full derived transcripts remain in approved private source storage rather than being copied into the public/system repository;
- only selected durable, relevant, AI-safe outputs flow into private memory repositories;
- a privacy-aware allowlist/project-opt-in layer is a planned hardening step for broad Drive monitoring.

## Generated artifacts

Generated OCR/transcript text can contain private source content. Treat it with the same privacy class as the source unless a deliberate sanitization step changes that classification.

Do not publish or promote generated artifacts merely because they are text files.

## Secrets

Never hard-code provider credentials in source code committed to Git. Runtime code may reference a secret key name (for example, a Script Properties key) but must not include the secret value.

If a secret is accidentally exposed, revoke/rotate it as soon as practical and remove it from relevant history where necessary.

## Publication rule

Before `career-os` is made public, audit the complete Git history as well as the current tree. A clean current tree is not enough if sensitive data appeared in earlier commits.

## Memory boundary

Personal facts/state belong in a separate private memory repository. Highly sensitive source material belongs outside AI-accessible storage entirely unless an explicit approved workflow provides an appropriate privacy boundary.
