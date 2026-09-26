from dataclasses import dataclass, asdict
from typing import Optional, Any


@dataclass(frozen=True)
class ContextRef:
    kind: str
    id: str
    label: str


@dataclass(frozen=True)
class SourceEnvelope:
    source_system: str
    source_id: str
    source_version: str
    name: str
    mime_type: str
    size_bytes: Optional[int] = None
    modified_at: Optional[str] = None
    context: Optional[ContextRef] = None
    metadata: Optional[dict[str, Any]] = None

    @property
    def source_key(self) -> str:
        return f"{self.source_system}:{self.source_id}"

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["source_key"] = self.source_key
        return value
