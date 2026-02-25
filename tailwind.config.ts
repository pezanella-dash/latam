import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ro: {
          blue: "#2563eb",
          gold: "#d97706",
          red: "#dc2626",
          dark: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
