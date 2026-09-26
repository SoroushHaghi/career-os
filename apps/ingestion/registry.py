import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from classify import PROCESSOR_ROUTE, classify_source


SCHEMA = """
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS sources (
  source_key TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  size_bytes INTEGER,
  modified_at TEXT,
  context_kind TEXT NOT NULL,
  context_id TEXT NOT NULL,
  context_label TEXT NOT NULL,
  processor_route TEXT NOT NULL,
  status TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  at TEXT NOT NULL,
  FOREIGN KEY(source_key) REFERENCES sources(source_key)
);
"""


class SourceRegistry:
    def __init__(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    def upsert(self, envelope):
        now = datetime.now(timezone.utc).isoformat()
        source_type = classify_source(envelope.mime_type, envelope.name)
        route = PROCESSOR_ROUTE[source_type]

        context = envelope.context
        context_kind = context.kind if context else "unclassified"
        context_id = context.id if context else "unclassified"
        context_label = context.label if context else "Unclassified"

        values = (
            envelope.source_key,
            envelope.source_system,
            envelope.source_id,
            envelope.source_version,
            envelope.name,
            envelope.mime_type,
            source_type,
            envelope.size_bytes,
            envelope.modified_at,
            context_kind,
            context_id,
            context_label,
            route,
            "REGISTERED",
            json.dumps(envelope.metadata or {}, sort_keys=True),
            now,
        )

        self.conn.execute(
            """
            INSERT INTO sources VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(source_key) DO UPDATE SET
              source_version=excluded.source_version,
              name=excluded.name,
              mime_type=excluded.mime_type,
              source_type=excluded.source_type,
              size_bytes=excluded.size_bytes,
              modified_at=excluded.modified_at,
              context_kind=excluded.context_kind,
              context_id=excluded.context_id,
              context_label=excluded.context_label,
              processor_route=excluded.processor_route,
              status=excluded.status,
              metadata_json=excluded.metadata_json,
              updated_at=excluded.updated_at
            """,
            values,
        )

        self.conn.execute(
            "INSERT INTO events(source_key,stage,status,detail_json,at) VALUES (?,?,?,?,?)",
            (
                envelope.source_key,
                "registration",
                "OK",
                json.dumps({"route": route}),
                now,
            ),
        )
        self.conn.commit()
        return source_type, route

    def rows(self):
        return [
            dict(row)
            for row in self.conn.execute("SELECT * FROM sources ORDER BY name")
        ]

    def events(self):
        return [
            dict(row)
            for row in self.conn.execute("SELECT * FROM events ORDER BY id")
        ]
