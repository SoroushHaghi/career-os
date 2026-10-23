# Career OS vNext Monitor

Status: ACTIVE PROTOTYPE
Branch: `vnext`

This directory contains a public-safe, browser-only monitoring page for Career OS vNext development.

## Data source

The page reads only public data from `SoroushHaghi/career-os`:
- vNext stage documents under `docs/vnext/`;
- recent commits on branch `vnext`;
- the GitHub compare view between `main` and `vnext`.

It does not read `career-memory`, Google Drive, API keys, private source files, transcripts, learner state, or other private runtime data.

## Runtime

No local install is required.

The intended GitHub Pages publishing source is:
- branch: `vnext`
- folder: `/docs`

The monitor URL is expected to be:
`https://soroushhaghi.github.io/career-os/monitor/`

The browser refreshes public GitHub state every five minutes.

## Future

Later versions may add public-safe CI/test/runtime health summaries, but private backend data must never be exposed client-side merely to make the dashboard more detailed.
