# Private Runtime Dashboard

Status: ACTIVE / STAGING

## URL

The dashboard is deployed as a private Apps Script web app.

Deployment ID is tracked in:
`config/apps-script-dashboard-deployment-id.txt`

The web app URL is:

`https://script.google.com/macros/s/<deployment-id>/exec`

## Access model

The dashboard deployment uses a dedicated Apps Script snapshot with:

- `access: MYSELF`
- `executeAs: USER_DEPLOYING`

The normal staging remote-admin deployment remains separate and HMAC-protected for GitHub Actions compatibility.

The dashboard and remote-admin deployment are versioned snapshots of the same Apps Script project, so they can share runtime Script Properties and queue state without copying secrets into browser code.

## Live data

The browser polls the Apps Script server every five seconds and currently shows:

- environment and build SHA;
- scanner/worker enablement;
- current and last runtime activity;
- image/audio queue counts and bounded job metadata;
- configured audio provider;
- Gemini quota/backoff state;
- last recorded TU/Gemini/Groq provider telemetry;
- current ingestion state;
- placeholders for synthesis, verification and promotion until those runtime stages are implemented.

## Offline behavior

The page caches the last successful sanitized snapshot in browser local storage. If connectivity is lost while the page is available, it shows the cached state with the last synchronization timestamp and clearly marks the view as offline.

This is a last-known-state fallback, not a claim that cloud runtime activity can be observed live without internet access.

## Privacy

The dashboard does not render:

- API keys or credentials;
- full prompts;
- transcripts;
- raw source contents;
- Career Memory private records.

Queue item names and bounded operational errors may be shown because the dashboard itself is restricted to the deploying user.

## Deployment safety

Dashboard deployment and ordinary runtime deployment share one concurrency group so they cannot push conflicting Apps Script source snapshots simultaneously.

The dashboard workflow:

1. builds and validates the private dashboard profile;
2. pushes the private snapshot;
3. creates or updates the private dashboard deployment;
4. restores the ordinary staging source package;
5. refreshes the staging remote-admin deployment.

Production remains separately approval-gated.
