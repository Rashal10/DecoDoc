import type { Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const HOUR_MS = 60 * 60 * 1000;

export function analysisRateKey(req: Request): string {
  if (req.authUser?.id) return `user:${req.authUser.id}`;
  if (req.anonymousSession?.id) return `session:${req.anonymousSession.id}`;
  return ipKeyGenerator(req.ip ?? "0.0.0.0");
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT", message: "Too many auth attempts. Try again later." },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT", message: "Too many search requests. Try again in a minute." },
});

export const analyzeAccountLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => analysisRateKey(req),
  message: { error: "RATE_LIMIT", message: "Too many analyses from this account. Try again in an hour." },
});

export const analyzeNetworkLimiter = rateLimit({
  windowMs: HOUR_MS,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT", message: "Too many analyses from this network. Try again in an hour." },
});
