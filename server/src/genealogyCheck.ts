import type { GenealogyEntry } from "@decodoc/shared";

export function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function titlesLooselyMatch(a: string, b: string): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 18 && right.length >= 18 && (left.includes(right) || right.includes(left))) return true;
  return false;
}

/** `true` keeps and marks confirmed, `null` keeps as inferred, `false` drops. */
export function keepConfirmedAncestors(
  entries: GenealogyEntry[],
  checks: Array<boolean | null>
): GenealogyEntry[] {
  const kept: GenealogyEntry[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const check = checks[index];
    if (!entry || check === false) continue;
    kept.push({
      ...entry,
      confidence: check === true ? "confirmed" : entry.confidence ?? "inferred",
    });
  }
  return kept;
}
