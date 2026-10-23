# TU Braunschweig KI-Toolbox integration

Status: staging-only / credential not stored in Git

## Purpose

Use the TU Braunschweig KI-Toolbox as an additional zero-cost provider pool for
non-personal academic/technical reasoning tasks. The current Career OS integration
is intentionally text-only until the TU API itself proves additional media
capabilities.

## Security and privacy

- Never commit or log the API token.
- Staging credential name: `TUBS_KI_TOOLBOX_API_TOKEN`.
- Store it as a GitHub Environment secret in `career-os-staging`.
- The staging workflow copies it to Apps Script Script Properties through the
  authenticated remote-admin channel. Only token presence is exposed by health
  checks; the value is never returned.
- Do not configure the production environment until production cutover is
  separately approved.
- TU KI-Toolbox calls fail closed unless the caller explicitly supplies
  `privacyApproved: true` and `privacyClass: academic_non_personal`.
- This is an additional guard, not a substitute for the planned upstream privacy
  preflight/redaction layer.

## Current public API contract

Endpoint:

`POST https://ki-toolbox.tu-braunschweig.de/api/v1/chat/send`

Authentication:

`Authorization: Bearer <token>`

Career OS uses stateless calls with `thread: null`.

The parser expects the documented line-delimited JSON response and consumes the
final `type=done` event.

## Initial approved model pool

On-premise:
- `Qwen/Qwen3.8-27B`
- `openai/gpt-oss-120b`
- `mistralai/Magistral-Small-2509`
- `Qwen/Qwen2.5-Coder-32B-Instruct`
- `microsoft/phi-4`

External:
- `gpt-5.6-luna`
- `gpt-5.6-terra`
- `gpt-6-astra`

The allowlist is deliberately narrow and version-controlled. Adding a model is a
routing/config change rather than an arbitrary user-supplied provider call.

## Probe procedure

The manual GitHub Actions workflow `TU KI-Toolbox Staging Probe`:

1. reads the GitHub Environment secret;
2. synchronizes it into staging Script Properties;
3. verifies presence without exposing the value;
4. sends one fixed non-personal health-check prompt to exactly one selected model;
5. reports HTTP status, latency, response length and any rate/retry headers.

The probe never sends Drive content or user data.

## Next step after first successful probe

Benchmark a small, sanitized academic suite across only the models relevant to a
specific task. Record quality, latency, error behavior and response-schema
stability before assigning default synthesis/verifier routing.
