import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-helvetica)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        dialogue: ["var(--font-copernicus)", "Georgia", "serif"],
      },
      colors: {
        blush: "var(--color-blush-paper)",
        carbon: "var(--color-carbon-ink)",
        fossil: "var(--color-fossil-gray)",
        signal: "var(--color-signal-blue)",
        pumpkin: "var(--color-pumpkin-orange)",
        surface: "var(--color-surface-solid)",
        border: "var(--color-border)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        spotlight: "spotlight 2s ease 0.75s 1 forwards",
        spin: "spin var(--duration, 3s) linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
