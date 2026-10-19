export const CITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function citationsAreFresh(fetchedAt: Date | null, now = Date.now()): boolean {
  if (!fetchedAt) return false;
  return now - fetchedAt.getTime() < CITATION_TTL_MS;
}
