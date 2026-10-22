import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { ZodError } from "zod";
import { isAllowedOrigin } from "./config";
import { attachAuthContext, parseCookies } from "./auth";
import { authRouter } from "./auth-routes";
import { HttpError } from "./httpError";
import { requireTrustedOrigin } from "./origin";
import { authLimiter } from "./rateLimit";
import { router as apiRouter } from "./routes";

export function createApp() {
  const app = express();

  // Production traffic passes through Cloudflare and then the Render proxy.
  // Trusting two hops makes req.ip the visitor address instead of a shared proxy address.
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 2);
  }

  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "2mb" }));
  app.use(parseCookies);
  app.use(attachAuthContext);
  app.use(requireTrustedOrigin);

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "DecoDoc API" });
  });

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api", apiRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled server error:", err);

    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: err.code,
        message: err.message,
        ...err.details,
      });
    }

    if (err instanceof ZodError) {
      const message = err.errors[0]?.message ?? "Invalid request.";
      return res.status(400).json({ error: "VALIDATION_ERROR", message });
    }

    if (err instanceof multer.MulterError) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message =
        err.code === "LIMIT_FILE_SIZE" ? "PDF exceeds the 30 MB upload limit." : err.message;
      return res.status(status).json({ error: err.code, message });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const status = typeof (err as { status?: number }).status === "number" ? (err as { status: number }).status : 500;
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    res.status(status).json({
      error: isProduction && status >= 500 ? "INTERNAL_ERROR" : message || "INTERNAL_ERROR",
      message:
        isProduction && status >= 500
          ? "An unexpected error occurred. Please try again."
          : message || "An unexpected server error occurred.",
    });
  });

  return app;
}
