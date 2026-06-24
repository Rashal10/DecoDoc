import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"]
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        timeout: 300_000,
        proxyTimeout: 300_000,
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("pdfjs-dist")) return "pdf";
          if (id.includes("recharts")) return "charts";
          if (id.includes("framer-motion") || id.includes("motion/")) return "motion";
          if (id.includes("react") || id.includes("react-dom")) return "react";
        }
      }
    }
  }
});
