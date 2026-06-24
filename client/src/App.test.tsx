import { describe, expect, it } from "vitest";
import { detectDomain } from "@decodoc/shared";

describe("DecoDoc client", () => {
  it("has a test harness", () => {
    expect("DecoDoc").toContain("Doc");
  });

  it("correctly classifies computer science papers as CS domain", () => {
    const title = "Attention Is All You Need";
    const abstract = "We present a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.";
    expect(detectDomain(title, abstract)).toBe("cs");
  });

  it("correctly classifies biology papers as biology domain", () => {
    const title = "A Programmable Dual-RNA-Guided DNA Endonuclease in Adaptive Bacterial Immunity";
    const abstract = "Bacteria and archaea encode adaptive immune systems called CRISPR-Cas that use RNA guides to target and cleave foreign DNA. Here we show that the Cas9 endonuclease can be programmed to cut double-stranded DNA.";
    expect(detectDomain(title, abstract)).toBe("biology");
  });
});
