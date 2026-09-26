import json
import sys
from pathlib import Path

from models import ContextRef, SourceEnvelope
from pipeline import ingest_sources
from registry import SourceRegistry


def main(input_json: str, db_path: str, output_json: str):
    payload = json.loads(Path(input_json).read_text())
    context = ContextRef(**payload["context"]) if payload.get("context") else None
    sources = [
        SourceEnvelope(context=context, **item)
        for item in payload["sources"]
    ]

    registry = SourceRegistry(db_path)
    run = ingest_sources(registry, sources)

    output = {
        "run": run,
        "registry": registry.rows(),
        "events": registry.events(),
    }
    Path(output_json).write_text(json.dumps(output, indent=2))
    print(json.dumps(run, indent=2))


if __name__ == "__main__":
    main(*sys.argv[1:4])
