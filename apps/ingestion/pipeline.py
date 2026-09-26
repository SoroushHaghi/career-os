from models import SourceEnvelope


def ingest_sources(registry, sources: list[SourceEnvelope]) -> list[dict]:
    results = []

    for source in sources:
        source_type, route = registry.upsert(source)
        results.append(
            {
                "source_key": source.source_key,
                "name": source.name,
                "source_type": source_type,
                "route": route,
                "status": "REGISTERED",
                "context": source.context.label if source.context else "Unclassified",
            }
        )

    return results
