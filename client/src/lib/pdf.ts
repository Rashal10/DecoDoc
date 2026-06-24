import * as pdfjsLib from "pdfjs-dist";
import { ANALYSIS_CANCELLED } from "./api";

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error(ANALYSIS_CANCELLED);
}

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const MAX_PDF_PAGES = 48;
const MAX_PDF_TEXT_CHARS = 48_000;

export async function extractPdfText(file: File, signal?: AbortSignal): Promise<string> {
  throwIfCancelled(signal);
  if (file.size > 30 * 1024 * 1024) throw new Error("PDFs are limited to 30 MB.");
  const buffer = await file.arrayBuffer();
  throwIfCancelled(signal);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  const pageLimit = Math.min(pdf.numPages, MAX_PDF_PAGES);

  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    throwIfCancelled(signal);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    
    // Group text items into lines using their y-position (transform[5]).
    // Items with the same (rounded) y are on the same visual line.
    const lineMap = new Map<number, string[]>();
    
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      // Round y to nearest 2px to group items on the same line
      const y = Math.round((item.transform[5] as number) / 2) * 2;
      const existing = lineMap.get(y) ?? [];
      existing.push(item.str);
      lineMap.set(y, existing);
    }
    
    // Sort lines by descending y (PDF y-axis is bottom-up, so higher y = top of page)
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const pageLines = sortedYs.map((y) => (lineMap.get(y) ?? []).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
    
    pages.push(pageLines.join("\n"));
  }

  let text = pages.join("\n\n");
  if (pdf.numPages > pageLimit) {
    text += `\n\n[First ${pageLimit} of ${pdf.numPages} pages extracted for analysis.]`;
  }
  if (text.length > MAX_PDF_TEXT_CHARS) {
    text = `${text.slice(0, MAX_PDF_TEXT_CHARS)}\n\n[Text truncated for analysis.]`;
  }
  return text;
}

