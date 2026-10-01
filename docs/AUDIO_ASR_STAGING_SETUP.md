# Long-Audio ASR Staging Setup

Status: opt-in staging path. Production remains unchanged until explicit approval.

## Architecture

Drive source -> Apps Script short-lived OAuth lease -> private Cloudflare streaming proxy -> Groq Whisper Large v3 -> Apps Script sidecar -> downstream Career OS synthesis.

The Drive file is never made public. No separate Google Cloud project, service account, Drive-folder sharing, or JSON key is required.

Apps Script already has Drive access. For each transcription it gives the proxy a short-lived Google OAuth token inside an authenticated lease. The proxy stores that credential only for the lease lifetime and gives Groq an opaque media URL.

## Required one-time setup

The Groq API key is already user-managed outside Git.

GitHub environment `career-os-staging` secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CAREER_OS_PROXY_SHARED_SECRET`

Apps Script Script Properties:
- `GROQ_API_KEY`
- `CAREER_OS_AUDIO_PROXY_BASE_URL`
- `CAREER_OS_AUDIO_PROXY_SHARED_SECRET`
- `CAREER_OS_AUDIO_TRANSCRIPTION_PROVIDER=groq`

The same `CAREER_OS_PROXY_SHARED_SECRET` value is used in GitHub and Apps Script.

Do not commit or paste credential values into Git or chat.

## First deployment

1. Create a Cloudflare API token for Worker deployment and note the Cloudflare Account ID.
2. Generate one random shared secret.
3. Store those three values in the GitHub `career-os-staging` environment.
4. Manually dispatch `.github/workflows/audio-proxy-deploy.yml` once.
5. Copy the deployed Worker base URL into Apps Script property `CAREER_OS_AUDIO_PROXY_BASE_URL`.
6. Set the Groq key, shared secret, and provider selection in Apps Script Script Properties.
7. Run `runCareerOsVnextStagingConfigProbe()`.
8. Run `runCareerOsVnextStagingAudioProxyProbe()`.
9. Run `runCareerOsVnextStagingWorkerOnce()`.

Expected successful audio logs:
- `AUDIO_PRIMARY_TRANSCRIBE_DONE ... provider=groq ... model=whisper-large-v3`
- `AUDIO_TRANSCRIBE_DONE ... provider=groq ... model=whisper-large-v3`
- `AUDIO_JOB_COMPLETE`

A legacy temporary Gemini upload may also be deleted when an already queued job migrates to the Groq path.

## Future automatic Worker deployment

After the first successful Worker deployment, set GitHub environment variable:
- `CLOUDFLARE_AUDIO_PROXY_ENABLED=true`

Relevant pushes to `vnext` can then deploy the staging Worker automatically.

## Privacy boundary

- Raw audio stays in Drive.
- The proxy stores the Drive OAuth token only inside the short-lived lease.
- Groq sees only the opaque proxy media URL, not the Drive file ID or Google OAuth token.
- The temporary lease auto-expires.
- No Google service account or folder sharing is used.

## Failure boundary

- 401 from the proxy: shared-secret or expired-lease problem.
- 401/403 from Drive through the proxy: Apps Script OAuth token expired or lacks Drive access; rerun the worker to create a fresh lease.
- 413/size rejection from Groq: do not retry blindly; add real temporal chunking/transcoding.
- 429/5xx from Groq: existing cross-run retry/backoff applies.
- Do not fall back to synchronous long-audio Gemini merely to mask an ASR failure.
