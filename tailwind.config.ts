import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ro: {
          // Core palette — CSS variable based for theme switching
          dark: "var(--ro-dark)",
          darker: "var(--ro-darker)",
          surface: "var(--ro-surface)",
          panel: "var(--ro-panel)",
          border: "var(--ro-border)",
          "border-light": "var(--ro-border-light)",
          muted: "var(--ro-muted)",

          // Accent — RO gold
          gold: "var(--ro-gold)",
          "gold-light": "var(--ro-gold-light)",
          "gold-dim": "var(--ro-gold-dim)",

          // Action colors
          blue: "#5b7fff",
          red: "#e04050",
          green: "#4aba6e",
        },
        element: {
          neutral: "#94a3b8",
          water: "#4a9eff",
          earth: "#c89440",
          fire: "#ef5544",
          wind: "#4ac87a",
          poison: "#b060e0",
          holy: "#f0d050",
          dark: "#8040d0",
          ghost: "#90a0b4",
          undead: "#708090",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #a07d28, #d4a636, #e8c55a, #d4a636, #a07d28)",
      },
    },
  },
  plugins: [],
};

export default config;
