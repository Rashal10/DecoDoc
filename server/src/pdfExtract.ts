export const MAX_PDF_PAGES = 48;
export const MAX_PDF_TEXT_CHARS = 48_000;
export const MIN_PDF_TEXT_CHARS = 100;
export const PDF_NO_TEXT_MESSAGE =
  "This PDF does not contain enough selectable text. It may be a scan or an image. Paste the abstract instead.";

export function isPdfBuffer(data: Uint8Array): boolean {
  if (data.length < 5) return false;
  return String.fromCharCode(data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0, data[4] ?? 0) === "%PDF-";
}

export function choosePdfText(serverText: string, clientText: string): string {
  const server = serverText.trim();
  const client = clientText.trim();
  const chosen = server.length >= client.length ? server : client;
  return chosen.slice(0, MAX_PDF_TEXT_CHARS);
}

export function limitExtractedText(text: string, pageNote?: string): string {
  let body = text.replace(/\s+\n/g, "\n").trim();
  if (pageNote) body = `${body}\n\n${pageNote}`;
  if (body.length > MAX_PDF_TEXT_CHARS) {
    return `${body.slice(0, MAX_PDF_TEXT_CHARS)}\n\n[Text truncated for analysis.]`;
  }
  return body;
}

export async function extractPdfTextFromBytes(data: Uint8Array): Promise<string> {
  if (!isPdfBuffer(data)) {
    throw new Error("The upload is not a PDF.");
  }

  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);
  const extracted = await extractText(pdf, { mergePages: false });
  const pages = (Array.isArray(extracted.text) ? extracted.text : [extracted.text])
    .slice(0, MAX_PDF_PAGES)
    .map((page) => page.trim())
    .filter(Boolean);
  const pageCount = extracted.totalPages ?? pages.length;
  const note = pageCount > MAX_PDF_PAGES ? `[First ${MAX_PDF_PAGES} of ${pageCount} pages extracted for analysis.]` : undefined;
  return limitExtractedText(pages.join("\n\n"), note);
}
