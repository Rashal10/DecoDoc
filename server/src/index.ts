import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { config, isAllowedOrigin, validateProductionConfig } from "./config";
import { attachAuthContext, parseCookies } from "./auth";
import { authRouter } from "./auth-routes";
import { initDatabase, closeDatabase } from "./init-db";
import { router as apiRouter } from "./routes";

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMIT", message: "Too many auth attempts. Try again later." },
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api", apiRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled server error:", err);

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
  const status = typeof err.status === "number" ? err.status : 500;
  res.status(status).json({
    error: isProduction && status >= 500 ? "INTERNAL_ERROR" : err.message || "INTERNAL_ERROR",
    message:
      isProduction && status >= 500
        ? "An unexpected error occurred. Please try again."
        : err.message || "An unexpected server error occurred.",
  });
});

async function main() {
  validateProductionConfig();
  await initDatabase();
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`[DecoDoc Server] Running on http://localhost:${config.port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[DecoDoc Server] ${signal} received, shutting down…`);
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
