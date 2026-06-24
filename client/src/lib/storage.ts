import { get, set } from "idb-keyval";
import type { AnalyzeResponse, Paper } from "@decodoc/shared";
import { toAnalysisExport } from "@decodoc/shared";
import { api } from "./api";

const RECENTS = "decodoc:recents";
const SAVED = "decodoc:saved";
const NOTES = "decodoc:notes";

export async function saveRecent(response: AnalyzeResponse) {
  const recents = await get<AnalyzeResponse[]>(RECENTS).then((v) => v ?? []);
  const exportable = toAnalysisExport(response);
  await set(RECENTS, [exportable, ...recents.filter((item) => item.paper.id !== response.paper.id)].slice(0, 10));
}

export async function getRecents() {
  const recents = (await get<AnalyzeResponse[]>(RECENTS)) ?? [];
  return recents.map((item) => toAnalysisExport(item));
}

export async function toggleSaved(paper: Paper, options?: { syncServer?: boolean }) {
  if (options?.syncServer) {
    const { bookmarks } = await api.toggleBookmark(paper.id);
    await set(SAVED, bookmarks);
    localStorage.setItem("decodoc:lastSaved", new Date().toISOString());
    return bookmarks;
  }

  const saved = await get<Paper[]>(SAVED).then((v) => v ?? []);
  const exists = saved.some((item) => item.id === paper.id);
  const next = exists ? saved.filter((item) => item.id !== paper.id) : [paper, ...saved];
  await set(SAVED, next);
  localStorage.setItem("decodoc:lastSaved", new Date().toISOString());
  return next;
}

export async function getSaved() {
  return (await get<Paper[]>(SAVED)) ?? [];
}

export async function setSaved(papers: Paper[]) {
  await set(SAVED, papers);
}

export async function mergeBookmarksOnLogin(): Promise<Paper[]> {
  const local = await getSaved();
  const { bookmarks } = await api.syncBookmarks(local.map((p) => p.id));
  await set(SAVED, bookmarks);
  return bookmarks;
}

export async function loadServerBookmarks(): Promise<Paper[]> {
  const { bookmarks } = await api.getBookmarks();
  await set(SAVED, bookmarks);
  return bookmarks;
}

export async function saveNote(paperId: string, note: string) {
  const notes = (await get<Record<string, string>>(NOTES)) ?? {};
  notes[paperId] = note;
  await set(NOTES, notes);
}

export async function getNotes() {
  return (await get<Record<string, string>>(NOTES)) ?? {};
}
