import { describe, expect, it } from "vitest";
import { choosePdfText, isPdfBuffer, limitExtractedText, MAX_PDF_TEXT_CHARS, PDF_NO_TEXT_MESSAGE } from "./pdfExtract";

describe("pdf extract helpers", () => {
  it("recognizes a PDF header", () => {
    expect(isPdfBuffer(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(isPdfBuffer(new TextEncoder().encode("not a pdf"))).toBe(false);
  });

  it("keeps the longer PDF read when the server extract is too short", () => {
    const client = "A".repeat(180);
    expect(choosePdfText("", client)).toBe(client);
    expect(choosePdfText("short", client)).toBe(client);
    expect(choosePdfText("B".repeat(240), client)).toBe("B".repeat(240));
  });

  it("tells the reader to paste an abstract when the PDF has no selectable text", () => {
    expect(PDF_NO_TEXT_MESSAGE).toContain("scan");
    expect(PDF_NO_TEXT_MESSAGE).toContain("Paste the abstract");
  });

  it("truncates extracted text at the analysis cap", () => {
    const limited = limitExtractedText("a".repeat(MAX_PDF_TEXT_CHARS + 20));
    expect(limited.endsWith("[Text truncated for analysis.]")).toBe(true);
    expect(limited.length).toBeLessThan(MAX_PDF_TEXT_CHARS + 80);
  });
});