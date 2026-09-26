# Career OS Ingestion vNext

Status: EARLY IMPLEMENTATION / VERTICAL SLICE

This package is the first executable slice of the connector-independent Career OS ingestion architecture.

Current slice:
- accepts normalized source envelopes;
- does not reject sources because a folder name fails a naming regex;
- classifies source types;
- registers source/version/context in SQLite;
- records the next processor route and processing events;
- keeps connector identity separate from processing logic.

This is intentionally a modular-monolith core. Heavy media processors, Dagster orchestration, semantic fusion, Obsidian export and Career Memory promotion are added behind these contracts rather than embedded into connector code.

## Run

```bash
python apps/ingestion/run_demo.py input.json registry.sqlite output.json
```

The input is a connector-produced JSON envelope. Real user/source IDs and credentials must never be committed to this repository.

## Next vertical slice

1. Drive connector adapter -> normalized envelopes.
2. Real image/audio processor adapters.
3. Evidence Unit + artifact tables.
4. Session fusion and semantic profile.
5. Dagster asset wrappers and live lineage UI.
6. Obsidian projection.
