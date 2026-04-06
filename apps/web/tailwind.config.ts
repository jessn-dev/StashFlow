import type { Config } from "tailwindcss";

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
          primary: "#0D3D3D", // Deep Teal
          accent: "#1A7A7A", // Teal
          text: "#444444", // Dark Gray
          bg: "#EFEFEF", // Light Gray
          white: "#FFFFFF",
        }
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        fintrack: {
          "primary": "#0D3D3D",
          "primary-content": "#FFFFFF",
          "accent": "#1A7A7A",
          "base-100": "#FFFFFF",
          "base-200": "#EFEFEF",
          "base-content": "#444444",
          "info": "#3ABFF8",
          "success": "#36D399",
          "warning": "#FBBD23",
          "error": "#F87272",
        },
      },
      "dark", // Fallback for dark mode
    ],
  },
};
export default config;