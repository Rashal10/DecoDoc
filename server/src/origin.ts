import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "./config";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return next();

  const origin = req.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "ORIGIN_REQUIRED",
        message: "This request was missing an origin.",
      });
    }
    return next();
  }

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({
      error: "ORIGIN_NOT_ALLOWED",
      message: "This site cannot call the API.",
    });
  }

  next();
}
