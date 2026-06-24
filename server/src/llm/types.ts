import type { Schema } from "@google/generative-ai";

export interface LlmProvider {
  readonly name: string;
  generateJson(prompt: string, schema: Schema, preferredModel?: string): Promise<string>;
  generateText(prompt: string, preferredModel?: string): Promise<string>;
}
