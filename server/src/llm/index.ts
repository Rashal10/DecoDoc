import type { Schema } from "@google/generative-ai";
import { config } from "../config";
import { createGeminiProvider } from "./gemini";
import { createGroqProvider, createOpenRouterProvider } from "./openai-compat";
import type { LlmProvider } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /503|429|high demand|overloaded|resource exhausted|rate limit|unavailable|too many requests/i.test(
    message
  );
}

function stripJsonFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

function parseJsonResponse(raw: string): string {
  const text = stripJsonFences(raw);
  JSON.parse(text);
  return text;
}

function getProviders(): LlmProvider[] {
  const byName: Record<string, LlmProvider | null> = {
    groq: createGroqProvider(),
    openrouter: createOpenRouterProvider(),
    gemini: createGeminiProvider()
  };

  const preferred = config.llmProvider;
  const order = [preferred, "groq", "openrouter", "gemini"];
  const seen = new Set<string>();
  const providers: LlmProvider[] = [];

  for (const name of order) {
    if (seen.has(name)) continue;
    seen.add(name);
    const provider = byName[name];
    if (provider) providers.push(provider);
  }

  return providers;
}

export function hasGenerationProvider(): boolean {
  return getProviders().length > 0;
}

async function runWithFallback(
  run: (provider: LlmProvider) => Promise<string>
): Promise<string> {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new Error(
      "No LLM provider configured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY."
    );
  }

  const errors: string[] = [];
  for (const provider of providers) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await run(provider);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (isRetryableError(error) && attempt < 2) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
        errors.push(`${provider.name}: ${message}`);
        break;
      }
    }
  }

  throw new Error("Failed to generate with all LLM providers: " + errors.join("; "));
}

export async function generateJson(
  schema: Schema,
  prompt: string,
  preferredModel?: string
): Promise<string> {
  const jsonPrompt = `${prompt}\n\nReturn a single valid JSON object matching the requested structure. No markdown fences.`;
  const raw = await runWithFallback((provider) =>
    provider.generateJson(jsonPrompt, schema, preferredModel)
  );

  try {
    return parseJsonResponse(raw);
  } catch {
    const repairPrompt = `Fix this invalid JSON and return only valid JSON:\n\n${stripJsonFences(raw)}`;
    const repaired = await runWithFallback((provider) =>
      provider.generateJson(repairPrompt, schema, preferredModel)
    );
    return parseJsonResponse(repaired);
  }
}

export async function generateText(prompt: string, preferredModel?: string): Promise<string> {
  return runWithFallback((provider) => provider.generateText(prompt, preferredModel));
}
