import { createApp } from "./app";
import { config, validateProductionConfig } from "./config";
import { closeDatabase, initDatabase } from "./init-db";
import { requeueTrackedJobs } from "./jobState";
import { startJobResumeLoop, stopJobResumeLoop } from "./runAnalysis";

async function main() {
  console.log("[DecoDoc Server] Starting");
  validateProductionConfig();
  const app = createApp();
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`[DecoDoc Server] Listening on http://localhost:${config.port}`);
  });

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[DecoDoc Server] ${signal} received, shutting down.`);
    stopJobResumeLoop();
    try {
      await requeueTrackedJobs();
    } catch (error) {
      console.error("Could not requeue analysis jobs:", error);
    }
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await initDatabase();
  startJobResumeLoop();
  console.log("[DecoDoc Server] Ready");
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
