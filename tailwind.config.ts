import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0d1117",
        accent: {
          DEFAULT: "#1d4ed8",
          light: "#eef3fc",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Cascadia Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
