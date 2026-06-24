import { SignJWT, jwtVerify } from "jose";
import { config } from "./config";

const AUTH_COOKIE = "decodoc_auth";
const TOKEN_TTL = "30d";

function secretKey() {
  return new TextEncoder().encode(config.authJwtSecret);
}

export type AuthTokenPayload = {
  sub: string;
  email: string | null;
};

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(secretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = payload.sub;
    if (!sub) return null;
    return {
      sub,
      email: typeof payload.email === "string" ? payload.email : null,
    };
  } catch {
    return null;
  }
}

export { AUTH_COOKIE };

export function authCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function clearAuthCookieOptions() {
  return { ...authCookieOptions(), maxAge: 0 };
}
