import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef1f8",
          100: "#d6ddef",
          400: "#4a5a8a",
          600: "#1e2a52",
          700: "#162041",
          800: "#101838",
          900: "#0b1230",
          950: "#070c22",
        },
        brand: {
          // Antarestar orange
          400: "#ff9d4d",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,56,0.06), 0 1px 2px rgba(16,24,56,0.04)",
        cardhover: "0 8px 30px rgba(16,24,56,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
