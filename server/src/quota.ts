import type { NextFunction, Request, Response } from "express";
import { countAnonymousUsage, countDailyUserUsage } from "./db";

export const ANONYMOUS_LIMIT = 3;
export const AUTH_DAILY_LIMIT = 10;

export async function checkAnalysisQuota(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.authUser) {
      const used = await countDailyUserUsage(req.authUser.id);
      if (used >= AUTH_DAILY_LIMIT) {
        return res.status(429).json({
          error: "DAILY_LIMIT",
          message: `You've reached your daily limit of ${AUTH_DAILY_LIMIT} analyses. Try again tomorrow.`,
          used,
          limit: AUTH_DAILY_LIMIT,
          remaining: 0,
        });
      }
      return next();
    }

    const session = req.anonymousSession;
    if (!session) {
      return res.status(401).json({ error: "SESSION_REQUIRED", message: "Session required." });
    }

    const used = await countAnonymousUsage(session.id);
    if (used >= ANONYMOUS_LIMIT) {
      return res.status(401).json({
        error: "LOGIN_REQUIRED",
        message: "You've used your 3 free analyses. Sign in to continue.",
        used,
        limit: ANONYMOUS_LIMIT,
        remaining: 0,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function getUsageStatus(req: Request) {
  if (req.authUser) {
    const used = await countDailyUserUsage(req.authUser.id);
    return {
      authenticated: true,
      used,
      limit: AUTH_DAILY_LIMIT,
      remaining: Math.max(0, AUTH_DAILY_LIMIT - used),
    };
  }

  const used = req.anonymousSession ? await countAnonymousUsage(req.anonymousSession.id) : 0;
  return {
    authenticated: false,
    used,
    limit: ANONYMOUS_LIMIT,
    remaining: Math.max(0, ANONYMOUS_LIMIT - used),
  };
}
