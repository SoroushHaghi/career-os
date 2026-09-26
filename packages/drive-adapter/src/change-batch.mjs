export function createChangeBatch(input) {
  if (!input.cursorBefore || !input.cursorAfter) throw new TypeError('change batch cursors are required');

  const byFile = new Map();
  for (const item of input.events ?? []) {
    const fileId = String(item.fileId ?? '');
    if (!fileId) continue;
    byFile.set(fileId, {
      fileId,
      removed: Boolean(item.removed),
      changeTime: item.changeTime ?? null,
    });
  }

  return {
    cursorBefore: String(input.cursorBefore),
    cursorAfter: String(input.cursorAfter),
    events: [...byFile.values()],
  };
}

export function mayAdvanceCursor(batch, durableFileIds = []) {
  const durable = new Set(durableFileIds.map(String));
  return batch.events.every((event) => durable.has(event.fileId));
}
