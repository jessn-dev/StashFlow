import type { Config } from "tailwindcss";
import { theme as sharedTheme } from "@fintrack/theme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: sharedTheme.colors.primary,
          accent: sharedTheme.colors.accent,
          text: sharedTheme.colors.text,
          bg: sharedTheme.colors.bg,
          white: sharedTheme.colors.white,
        }
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        fintrack: {
          "primary": sharedTheme.colors.primary,
          "primary-content": sharedTheme.colors.white,
          "accent": sharedTheme.colors.accent,
          "base-100": sharedTheme.colors.white,
          "base-200": sharedTheme.colors.bg,
          "base-content": sharedTheme.colors.text,
          "info": sharedTheme.colors.info,
          "success": sharedTheme.colors.success,
          "warning": sharedTheme.colors.warning,
          "error": sharedTheme.colors.error,
        },
      },
      "dark", // Fallback for dark mode
    ],
  },
};
export default config;