export function chunkText(text: string, chunkSize = 1000, overlap = 200) {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}
