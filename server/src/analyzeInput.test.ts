import { describe, expect, it } from "vitest";
import { analyzeSchema, resolveRequestedModel } from "./analyzeInput";
import { HttpError } from "./httpError";

describe("analyze input", () => {
  it("rejects a paper body above the character cap", () => {
    const parsed = analyzeSchema.safeParse({
      inputType: "abstract",
      value: "a".repeat(50_001),
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts the configured model and rejects any other name", () => {
    expect(resolveRequestedModel(undefined, "llama-3.3-70b-versatile")).toBeUndefined();
    expect(resolveRequestedModel("llama-3.3-70b-versatile", "llama-3.3-70b-versatile")).toBe(
      "llama-3.3-70b-versatile"
    );
    expect(() => resolveRequestedModel("some-other-model", "llama-3.3-70b-versatile")).toThrow(HttpError);
  });
});
