import { z } from "zod";
import { HttpError } from "./httpError";

export const MAX_ANALYSIS_CHARS = 50_000;

export const analyzeSchema = z.object({
  inputType: z.enum(["arxiv", "doi", "abstract", "pdf"]),
  value: z.string().trim().min(10).max(MAX_ANALYSIS_CHARS),
  title: z.string().trim().max(300).optional(),
  model: z.string().trim().max(80).optional(),
  async: z.boolean().optional(),
});

export function resolveRequestedModel(model: string | undefined, allowedModel: string): string | undefined {
  if (!model) return undefined;
  if (model !== allowedModel) {
    throw new HttpError(400, "MODEL_NOT_ALLOWED", "That model is not available.");
  }
  return model;
}
