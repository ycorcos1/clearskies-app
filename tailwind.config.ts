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
        primary: {
          DEFAULT: "#2C82C9",
          dark: "#1B4965",
        },
        secondary: {
          DEFAULT: "#56CCF2",
          dark: "#5BC0EB",
        },
        success: {
          DEFAULT: "#2ECC71",
          dark: "#27AE60",
        },
        warning: {
          DEFAULT: "#F5B041",
          dark: "#F1C40F",
        },
        danger: {
          DEFAULT: "#E74C3C",
          dark: "#C0392B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
export default config;
