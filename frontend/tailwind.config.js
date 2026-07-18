/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Every color resolves through a CSS variable holding "R G B" channels,
        // so Tailwind's opacity modifiers (bg-ink/40) keep working, and the
        // actual values flip between the .dark and .light blocks in index.css -
        // no component needs to know which theme is active.
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        surfaceLight: "rgb(var(--color-surface-light) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        goldSoft: "rgb(var(--color-gold-soft) / <alpha-value>)",
        teal: "rgb(var(--color-teal) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--color-gold) / 0.25), 0 8px 24px -8px rgb(var(--color-gold) / 0.25)",
      },
      keyframes: {
        blobFloat: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(4%, -6%) scale(1.08)" },
          "66%": { transform: "translate(-3%, 4%) scale(0.95)" },
        },
        enterUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blobFloat: "blobFloat 18s ease-in-out infinite",
        enterUp: "enterUp 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
