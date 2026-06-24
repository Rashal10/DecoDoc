import OpenAI from "openai";
import type { Schema } from "@google/generative-ai";
import { config } from "../config";
import type { LlmProvider } from "./types";

type OpenAiCompatOptions = {
  name: string;
  apiKey: string;
  baseURL: string;
  defaultModel: string;
};

export function createOpenAiCompatProvider(options: OpenAiCompatOptions): LlmProvider {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: options.baseURL
  });

  return {
    name: options.name,
    async generateJson(prompt: string, _schema: Schema, preferredModel?: string): Promise<string> {
      const response = await client.chat.completions.create({
        model: preferredModel ?? options.defaultModel,
        messages: [
          {
            role: "system",
            content:
              "You are a precise JSON API. Respond with a single valid JSON object only. No markdown fences or commentary."
          },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: config.llmMaxTokens
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`${options.name}: empty response`);
      }
      return content;
    },

    async generateText(prompt: string, preferredModel?: string): Promise<string> {
      const response = await client.chat.completions.create({
        model: preferredModel ?? options.defaultModel,
        messages: [{ role: "user", content: prompt }],
        max_tokens: config.llmMaxTokens
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error(`${options.name}: empty response`);
      }
      return content;
    }
  };
}

export function createGroqProvider(): LlmProvider | null {
  if (!config.groqApiKey) return null;
  return createOpenAiCompatProvider({
    name: "groq",
    apiKey: config.groqApiKey,
    baseURL: config.groqBaseUrl,
    defaultModel: config.llmModel
  });
}

export function createOpenRouterProvider(): LlmProvider | null {
  if (!config.openrouterApiKey) return null;
  return createOpenAiCompatProvider({
    name: "openrouter",
    apiKey: config.openrouterApiKey,
    baseURL: config.openrouterBaseUrl,
    defaultModel: config.openrouterModel
  });
}
