export type PaperVisibility = "public" | "private";

export type OwnedPaper = {
  visibility: PaperVisibility;
  ownerUserId: string | null;
  ownerSessionId: string | null;
};

export type Reader = {
  userId?: string;
  sessionId?: string;
};

export function canReadPaper(paper: OwnedPaper, reader: Reader): boolean {
  if (paper.visibility !== "private") return true;
  if (reader.userId && reader.userId === paper.ownerUserId) return true;
  if (reader.sessionId && reader.sessionId === paper.ownerSessionId) return true;
  return false;
}
