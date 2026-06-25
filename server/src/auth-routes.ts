import { Router } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "./config";
import {
  createEmailUser,
  getUserByEmail,
  getUserById,
  upsertUser,
} from "./db";
import {
  AUTH_COOKIE,
  authCookieOptions,
  clearAuthCookieOptions,
  signAuthToken,
} from "./jwt-auth";
import { hashPassword, verifyPassword } from "./password";

const OAUTH_STATE_COOKIE = "decodoc_oauth_state";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().trim().max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

export const authRouter = Router();

function publicUser(user: {
  id: string;
  email: string | null;
  displayName: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

async function setAuthCookie(
  res: import("express").Response,
  user: { id: string; email: string | null }
) {
  const token = await signAuthToken({ sub: user.id, email: user.email });
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
}

authRouter.get("/config", (_req, res) => {
  res.json({
    google: Boolean(config.googleClientId && config.googleClientSecret),
  });
});

authRouter.get("/me", async (req, res, next) => {
  try {
    if (!req.authUser) {
      return res.status(401).json({ error: "NOT_AUTHENTICATED", message: "Not signed in." });
    }
    const user = await getUserById(req.authUser.id);
    if (!user) {
      return res.status(401).json({ error: "NOT_AUTHENTICATED", message: "Account not found." });
    }
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid registration details.";
      return res.status(400).json({ error: "VALIDATION_ERROR", message });
    }

    const { email, password, displayName } = parsed.data;
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: "EMAIL_IN_USE",
        message: "An account with this email already exists. Try signing in instead.",
      });
    }

    const user = await createEmailUser(email, hashPassword(password), displayName);
    await setAuthCookie(res, user);
    res.status(201).json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Invalid sign-in details.";
      return res.status(400).json({ error: "VALIDATION_ERROR", message });
    }

    const { email, password } = parsed.data;
    const user = await getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "No account found with this email. Check the spelling or create an account.",
      });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Incorrect password. Try again.",
      });
    }

    await setAuthCookie(res, user);
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE, clearAuthCookieOptions());
  res.json({ ok: true });
});

authRouter.get("/google", (req, res) => {
  if (!config.googleClientId || !config.googleClientSecret) {
    return res.redirect(
      `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Google sign-in is not available right now.")}`
    );
  }

  const state = randomBytes(24).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, { ...authCookieOptions(), maxAge: 10 * 60 * 1000 });

  const redirectUri = `${config.apiPublicUrl}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: config.googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

authRouter.get("/google/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const savedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    res.clearCookie(OAUTH_STATE_COOKIE, clearAuthCookieOptions());

    if (error || !code || typeof code !== "string") {
      return res.redirect(
        `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Google sign-in was cancelled.")}`
      );
    }

    if (!state || state !== savedState) {
      return res.redirect(
        `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Sign-in session expired. Please try again.")}`
      );
    }

    const redirectUri = `${config.apiPublicUrl}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return res.redirect(
        `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Google sign-in failed. Please try again.")}`
      );
    }

    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      return res.redirect(
        `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Google sign-in failed. Please try again.")}`
      );
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      return res.redirect(
        `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Could not read your Google profile.")}`
      );
    }

    const profile = (await profileRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    if (!profile.sub || !profile.email) {
      return res.redirect(
        `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Google did not share your email address.")}`
      );
    }

    const user = await upsertUser(`google:${profile.sub}`, profile.email, profile.name ?? null);
    await setAuthCookie(res, user);
    res.redirect(config.clientOrigin);
  } catch {
    res.redirect(
      `${config.clientOrigin}/sign-in?error=${encodeURIComponent("Something went wrong with Google sign-in.")}`
    );
  }
});
