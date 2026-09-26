# Known Baseline Defects

Updated: 2026-09-27

## DEFECT-001 — Image queue status helper mismatch

Status: CONFIRMED IN BASELINE / PRODUCTION UNCHANGED

The current Apps Script baseline uses the audio-status helper while enqueueing an image job. The image-status helper is the intended target.

vNext action:
- keep the deployed baseline unchanged for now;
- fix the helper call only after the complete public-safe baseline is imported;
- add a regression check before deployment.
