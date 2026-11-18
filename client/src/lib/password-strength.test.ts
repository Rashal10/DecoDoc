import { describe, expect, it } from "vitest";
import { passwordStrength, validateEmail } from "./password-strength";

describe("passwordStrength", () => {
  it("returns an empty result for an empty password", () => {
    expect(passwordStrength("").score).toBe(0);
  });

  it("flags short and common passwords", () => {
    expect(passwordStrength("abc").label).toBe("Too short");
    expect(passwordStrength("password").label).toBe("Weak");
    expect(passwordStrength("aaaaaaaaaaaaaaaaa").label).toBe("Weak");
  });

  it("rewards length and variety", () => {
    expect(passwordStrength("abcdefgh1").score).toBeLessThan(passwordStrength("Abcdefgh1234!").score);
    expect(passwordStrength("Correct-Horse-Battery-9").label).toBe("Strong");
  });
});

describe("validateEmail", () => {
  it("accepts normal addresses and rejects malformed ones", () => {
    expect(validateEmail("a@b.co")).toBe("");
    expect(validateEmail("")).not.toBe("");
    expect(validateEmail("not-an-email")).not.toBe("");
    expect(validateEmail("a@b")).not.toBe("");
  });
});
