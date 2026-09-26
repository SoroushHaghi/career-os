# Apps Script Staging Runbook

Status: READY FOR ONE-TIME STAGING PROJECT SETUP
Updated: 2026-09-27

## Purpose

Validate the repo-built Career OS runtime against real Google Drive and Gemini access without changing production.

## Safety boundary

The staging project is separate from production.

The public repository contains no API key, OAuth token, private Drive ID, or private test-folder ID.

Private staging values stay in:
- Apps Script Script Properties;
- GitHub repository/environment secrets for deployment authentication.

## One-time staging project setup

Create a new standalone Google Apps Script project named something like:

`Career OS vNext Staging`

Do not copy production triggers into it.

The repository build already contains:
- the complete sanitized baseline;
- the Drive advanced-service manifest;
- Git-derived build identity;
- non-destructive staging probes;
- vNext shadow self-test.

## Required Apps Script Script Properties

Set these only in the staging Apps Script project:

```text
CAREER_OS_ENVIRONMENT=staging
GEMINI_API_KEY=<existing private Gemini key>
CAREER_OS_STAGING_TEST_FOLDER_ID=<private Drive test-folder ID>
```

These values must never be committed to `career-os`.

## Optional GitHub deployment automation

The repository contains:

`.github/workflows/apps-script-staging-deploy.yml`

It requires two private GitHub secrets:

```text
APPS_SCRIPT_STAGING_ID
CLASPRC_JSON
```

The workflow is manual-only and deploys only to the staging project.

It does not set `GEMINI_API_KEY` or the test-folder ID. Those stay in Apps Script Script Properties.

## Validation order

Run in this order:

1. `getCareerOsBuildInfo()`
2. `runCareerOsVnextShadowSelfTest()`
3. `runCareerOsVnextStagingConfigProbe()`
4. `runCareerOsVnextStagingMetadataProbe()`

These are non-destructive.

Only after all four pass should live image/audio provider parity be enabled.

## Expected metadata-probe result

The probe should:
- read only the configured staging test folder;
- classify source MIME types;
- report checksum availability;
- not write artifacts;
- not install triggers;
- not invoke Gemini.

## Live-provider gate

Real OCR/transcription is a separate validation step.

Before running it:
- confirm the staging build SHA;
- confirm the staging test folder contains only intended test files;
- confirm `GEMINI_API_KEY` exists in staging Script Properties;
- keep production triggers untouched.

## Production gate

Passing staging does not authorize production replacement.

Production cutover remains a separate explicit approval after:
- image parity;
- audio parity;
- context-resolution parity;
- retry/idempotency checks;
- rollback verification.
