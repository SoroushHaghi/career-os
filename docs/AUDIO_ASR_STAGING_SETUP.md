# Long-Audio ASR Staging Setup

Status: opt-in staging path. Production remains unchanged until explicit approval.

## Architecture

Drive source -> private Cloudflare streaming lease -> Groq Whisper Large v3 -> Apps Script sidecar -> downstream Career OS synthesis.

The Drive file is not made public. Groq receives an opaque, short-lived lease URL. The proxy uses a dedicated Google service account that should only be granted Viewer access to the folders Career OS is allowed to transcribe.

## Required external credentials

Do not commit or paste credential values into Git or chat.

GitHub environment `career-os-staging` secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CAREER_OS_PROXY_SHARED_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

Apps Script Script Properties:
- `GROQ_API_KEY`
- `CAREER_OS_AUDIO_PROXY_BASE_URL`
- `CAREER_OS_AUDIO_PROXY_SHARED_SECRET`
- `CAREER_OS_AUDIO_TRANSCRIPTION_PROVIDER=groq`

The same `CAREER_OS_PROXY_SHARED_SECRET` value is used in GitHub and Apps Script.

## Least-privilege Drive boundary

For staging, share only the configured staging test folder with the Google service-account email as Viewer. Do not grant account-wide Drive access.

For production, expand access only to the explicit Career OS working root after staging succeeds and production cutover is separately approved.

## First deployment

1. Create the Groq API key.
2. Create the Cloudflare API token/account configuration for Worker deployment.
3. Create a dedicated Google service account, enable Drive API in its project, create its JSON credential, and share only the staging test folder with its service-account email.
4. Store the four GitHub staging secrets listed above.
5. Manually dispatch `.github/workflows/audio-proxy-deploy.yml` once. This deploys the Worker and sets the two Worker secrets.
6. Copy the deployed Worker base URL from the workflow output into Apps Script property `CAREER_OS_AUDIO_PROXY_BASE_URL`.
7. Set the Groq key, shared secret, and provider selection in Apps Script Script Properties.
8. Run `runCareerOsVnextStagingConfigProbe()`.
9. Run `runCareerOsVnextStagingAudioProxyProbe()`.
10. Run `runCareerOsVnextStagingWorkerOnce()`.

Expected successful audio logs include:
- `AUDIO_PRIMARY_TRANSCRIBE_DONE ... provider=groq ... model=whisper-large-v3`
- `AUDIO_TRANSCRIBE_DONE ... provider=groq ... model=whisper-large-v3`
- `AUDIO_JOB_COMPLETE`

A legacy temporary Gemini upload may also be deleted on successful migration of an already queued job.

## Future automatic Worker deployment

After the first successful Worker deployment, set GitHub environment variable:
- `CLOUDFLARE_AUDIO_PROXY_ENABLED=true`

Relevant pushes to `vnext` can then deploy the staging Worker automatically.

## Failure boundary

- 401/403 from the proxy: check shared-secret configuration or Drive sharing.
- 404 from Drive through proxy: service account cannot see the source or the source ID is stale.
- 413/size rejection from Groq: do not retry blindly; introduce true temporal audio preprocessing/chunking.
- 429/5xx from Groq: existing cross-run retry/backoff applies.
- Do not fall back to synchronous long-audio Gemini merely to mask an ASR failure.
