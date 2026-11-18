export type PasswordStrength = {
  /** 0 (empty) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: "" | "Too short" | "Weak" | "Fair" | "Good" | "Strong";
  hint: string;
};

export const MIN_PASSWORD_LENGTH = 8;

const COMMON = new Set([
  "password",
  "password1",
  "12345678",
  "123456789",
  "qwertyui",
  "qwerty123",
  "iloveyou",
  "letmein1",
  "decodoc1",
]);

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", hint: "" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      score: 1,
      label: "Too short",
      hint: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (COMMON.has(password.toLowerCase())) {
    return { score: 1, label: "Weak", hint: "This password is very common. Pick something less guessable." };
  }

  let points = 0;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) points += 1;
  if (/\d/.test(password)) points += 1;
  if (/[^A-Za-z0-9]/.test(password)) points += 1;
  if (/^(.)\1+$/.test(password)) points = 0;

  if (points <= 1) return { score: 1, label: "Weak", hint: "Add length, numbers, or symbols." };
  if (points === 2) return { score: 2, label: "Fair", hint: "A few more characters would help." };
  if (points === 3) return { score: 3, label: "Good", hint: "" };
  return { score: 4, label: "Strong", hint: "" };
}

export function validateEmail(value: string): string {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That doesn't look like an email address.";
  return "";
}
