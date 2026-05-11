// Splits raw text into ~500-character chunks aligned to sentence/paragraph boundaries.
// Heuristic: try paragraph breaks first, fall back to sentence boundaries, last resort hard cut.

const MAX_CHARS = 500;
const MIN_CHARS = 80;

export function chunkText(text: string): string[] {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length <= MAX_CHARS) return [trimmed];

  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  function flush() {
    const t = buffer.trim();
    if (t.length >= MIN_CHARS) chunks.push(t);
    else if (chunks.length > 0 && t.length > 0) {
      chunks[chunks.length - 1] += "\n\n" + t;
    } else if (t.length > 0) {
      chunks.push(t);
    }
    buffer = "";
  }

  for (const p of paragraphs) {
    if (buffer.length + p.length + 2 <= MAX_CHARS) {
      buffer = buffer.length === 0 ? p : `${buffer}\n\n${p}`;
      continue;
    }
    if (buffer.length > 0) flush();

    if (p.length <= MAX_CHARS) {
      buffer = p;
      continue;
    }

    // Paragraph itself too long — split by sentences
    const sentences = p.split(/(?<=[.!?])\s+/);
    let sBuf = "";
    for (const s of sentences) {
      if (sBuf.length + s.length + 1 > MAX_CHARS) {
        if (sBuf.trim().length >= MIN_CHARS) chunks.push(sBuf.trim());
        sBuf = s;
      } else {
        sBuf = sBuf.length === 0 ? s : `${sBuf} ${s}`;
      }
    }
    if (sBuf.trim().length > 0) buffer = sBuf.trim();
  }
  if (buffer.length > 0) flush();

  return chunks;
}
