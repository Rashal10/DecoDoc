import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMENSIONS, toVectorLiteral } from "./embedding";

describe("embedding vectors", () => {
  it("formats a full embedding as a pgvector literal", () => {
    const values = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, index) => (index === 0 ? 0.5 : 0));
    const literal = toVectorLiteral(values);
    expect(literal?.startsWith("[0.5,")).toBe(true);
    expect(literal?.endsWith("]")).toBe(true);
    expect(literal?.split(",")).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it("rejects a vector that cannot be stored in embedding_vec", () => {
    expect(toVectorLiteral([1, 2, 3])).toBeNull();
    const values = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
    values[4] = Number.NaN;
    expect(toVectorLiteral(values)).toBeNull();
  });
});
