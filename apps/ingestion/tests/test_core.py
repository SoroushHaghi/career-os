import os
import tempfile
import unittest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from models import ContextRef, SourceEnvelope
from registry import SourceRegistry
from pipeline import ingest_sources


class IngestionCoreTests(unittest.TestCase):
    def test_arbitrary_context_label_does_not_drop_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry = SourceRegistry(os.path.join(tmp, "registry.sqlite"))
            context = ContextRef(kind="collection", id="ctx-1", label="test")
            sources = [
                SourceEnvelope(
                    source_system="fixture",
                    source_id="audio-1",
                    source_version="v1",
                    name="lecture.m4a",
                    mime_type="audio/mpeg",
                    context=context,
                ),
                SourceEnvelope(
                    source_system="fixture",
                    source_id="image-1",
                    source_version="v1",
                    name="board.heic",
                    mime_type="image/heif",
                    context=context,
                ),
            ]

            result = ingest_sources(registry, sources)

            self.assertEqual(len(result), 2)
            self.assertEqual(result[0]["route"], "audio_preprocessor")
            self.assertEqual(result[1]["route"], "image_preprocessor")
            self.assertTrue(all(item["context"] == "test" for item in result))


if __name__ == "__main__":
    unittest.main()
