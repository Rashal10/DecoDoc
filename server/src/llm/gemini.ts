import { GoogleGenerativeAI, type Schema } from "@google/generative-ai";
import { config } from "../config";
import type { LlmProvider } from "./types";

function generationModels(): string[] {
  const preferred = config.geminiModel;
  return [...new Set([preferred, "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash-lite", "gemini-2.0-flash"])];
}

export function createGeminiProvider(): LlmProvider | null {
  if (!config.geminiApiKey) return null;

  const ai = new GoogleGenerativeAI(config.geminiApiKey);

  return {
    name: "gemini",
    async generateJson(prompt: string, schema: Schema, preferredModel?: string): Promise<string> {
      const modelsToTry = preferredModel
        ? [preferredModel, ...generationModels().filter((m) => m !== preferredModel)]
        : generationModels();

      const errors: string[] = [];
      for (const modelName of modelsToTry) {
        try {
          const model = ai.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: schema
            }
          });
          const result = await model.generateContent(prompt);
          return result.response.text();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${modelName}: ${message}`);
        }
      }
      throw new Error(errors.join("; "));
    },

    async generateText(prompt: string, preferredModel?: string): Promise<string> {
      const modelName = preferredModel ?? config.geminiModel;
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  };
}
