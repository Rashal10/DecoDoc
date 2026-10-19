import { describe, expect, it } from "vitest";
import { isPdfBuffer, limitExtractedText, MAX_PDF_TEXT_CHARS } from "./pdfExtract";

describe("pdf extract helpers", () => {
  it("recognizes a PDF header", () => {
    expect(isPdfBuffer(new TextEncoder().encode("%PDF-1.7"))).toBe(true);
    expect(isPdfBuffer(new TextEncoder().encode("not a pdf"))).toBe(false);
  });

  it("truncates extracted text at the analysis cap", () => {
    const limited = limitExtractedText("a".repeat(MAX_PDF_TEXT_CHARS + 20));
    expect(limited.endsWith("[Text truncated for analysis.]")).toBe(true);
    expect(limited.length).toBeLessThan(MAX_PDF_TEXT_CHARS + 80);
  });
});