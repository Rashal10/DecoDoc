// gemini-embedding-001 returns 3072 values by default. papers.embedding_vec uses that width.
// Do not request a smaller vector or older rows will no longer match new queries.
export const EMBEDDING_DIMENSIONS = 3072;

export function toVectorLiteral(values: number[]): string | null {
  if (values.length !== EMBEDDING_DIMENSIONS) return null;
  if (values.some((value) => !Number.isFinite(value))) return null;
  return `[${values.join(",")}]`;
}
