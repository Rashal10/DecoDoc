import type { Analysis } from "@decodoc/shared";
import { isCurrentAnalysis } from "@decodoc/shared";

export function parseCachedAnalysis(payload: unknown): Analysis | null {
  try {
    const analysis = (typeof payload === "string" ? JSON.parse(payload) : payload) as Analysis;
    return isCurrentAnalysis(analysis) ? analysis : null;
  } catch {
    return null;
  }
}
