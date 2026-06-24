import { clerkClient, clerkMiddleware, getAuth } from "@clerk/express";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { createAnonymousSession, getAnonymousSession, getUserById, upsertUser } from "./db";
import { AUTH_COOKIE, verifyAuthToken } from "./jwt-auth";

export const SESSION_COOKIE = "decodoc_sid";

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; authProviderId: string };
      anonymousSession?: { id: string };
    }
  }
}

export const clerkAuth = clerkMiddleware();

export const parseCookies = cookieParser();

function sessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  };
}

async function resolveJwtUser(req: Request): Promise<{ id: string; authProviderId: string } | null> {
  const token = req.cookies?.[AUTH_COOKIE] as string | undefined;
  if (!token) return null;
  const payload = await verifyAuthToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.sub);
  if (!user) return null;
  return { id: user.id, authProviderId: user.authProviderId };
}

export async function attachAuthContext(req: Request, res: Response, next: NextFunction) {
  try {
    const jwtUser = await resolveJwtUser(req);
    if (jwtUser) {
      req.authUser = jwtUser;
    } else if (config.clerkSecretKey) {
      const { userId } = getAuth(req);
      if (userId) {
        let email: string | null = null;
        let displayName: string | null = null;
        try {
          const clerkUser = await clerkClient.users.getUser(userId);
          email = clerkUser.emailAddresses[0]?.emailAddress ?? null;
          displayName = clerkUser.fullName ?? clerkUser.username ?? null;
        } catch {
          // Clerk lookup failed — still upsert with provider id only
        }
        const user = await upsertUser(userId, email, displayName);
        req.authUser = { id: user.id, authProviderId: user.authProviderId };
      }
    }

    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (sessionId) {
      const session = await getAnonymousSession(sessionId);
      if (session) {
        req.anonymousSession = { id: session.id };
      }
    }

    if (!req.authUser && !req.anonymousSession) {
      const session = await createAnonymousSession();
      res.cookie(SESSION_COOKIE, session.id, sessionCookieOptions());
      req.anonymousSession = { id: session.id };
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser) {
    return res.status(401).json({ error: "AUTH_REQUIRED", message: "Sign in required." });
  }
  next();
}
