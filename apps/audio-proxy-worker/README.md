# Career OS Audio Proxy

Purpose: stream a private Google Drive audio file to the dedicated ASR provider without making the Drive file public and without creating a separate Google service account.

Flow:
1. Apps Script creates a short-lived lease and includes its current Google OAuth token.
2. The Cloudflare Worker stores the lease temporarily in a Durable Object.
3. Groq receives only an opaque temporary media URL.
4. The Worker uses the short-lived token to read that one Drive file and stream it.
5. The lease is deleted automatically after expiry.

The Drive file stays private. No Drive folder sharing or extra Google Cloud service account is required.

Secrets are never committed:
- Worker secret: `CAREER_OS_PROXY_SHARED_SECRET`
- Apps Script Script Property with the same value: `CAREER_OS_AUDIO_PROXY_SHARED_SECRET`

Deployment is handled by the GitHub workflow after Cloudflare credentials are configured in the `career-os-staging` environment.
