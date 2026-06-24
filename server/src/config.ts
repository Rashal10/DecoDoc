import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", ".env")]) {
  if (existsSync(envPath)) loadEnv({ path: envPath, override: false });
}

function parseExtraOrigins(): string[] {
  return (process.env.CLIENT_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  databaseUrl:
    process.env.DATABASE_URL ?? "postgresql://decodoc:decodoc@localhost:5432/decodoc",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
  llmProvider: process.env.LLM_PROVIDER ?? "groq",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqBaseUrl: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openrouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct",
  llmModel: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
  llmMaxTokens: Number(process.env.LLM_MAX_TOKENS ?? 16384),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  clientOrigins: parseExtraOrigins(),
  allowVercelPreviews: process.env.ALLOW_VERCEL_PREVIEWS === "true",
  maxPdfBytes: 30 * 1024 * 1024,
  semanticScholarApiKey: process.env.SEMANTIC_SCHOLAR_API_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? "dev-only-change-me-in-production",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  apiPublicUrl: process.env.API_PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 8787)}`,
};

const DEV_JWT_SECRET = "dev-only-change-me-in-production";
const DEV_DATABASE_URL = "postgresql://decodoc:decodoc@localhost:5432/decodoc";

export function validateProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") return;

  if (!config.authJwtSecret || config.authJwtSecret === DEV_JWT_SECRET) {
    throw new Error("AUTH_JWT_SECRET must be set to a strong random value in production.");
  }

  if (!config.databaseUrl || config.databaseUrl === DEV_DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to your production Postgres URL.");
  }

  if (!config.groqApiKey && !config.openrouterApiKey && !config.geminiApiKey) {
    throw new Error("Set at least one LLM provider key: GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.");
  }

  if (!config.geminiApiKey) {
    console.warn("[DecoDoc] GEMINI_API_KEY is not set — embeddings and semantic search will fail.");
  }
}

const LOCAL_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = new Set([config.clientOrigin, ...config.clientOrigins, ...LOCAL_DEV_ORIGINS]);
  if (allowed.has(origin)) return true;
  if (config.allowVercelPreviews) {
    try {
      const { hostname, protocol } = new URL(origin);
      if (protocol === "https:" && hostname.endsWith(".vercel.app")) return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function requireGeminiKey(): string {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is required for embeddings.");
  }
  return config.geminiApiKey;
}
