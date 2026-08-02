import type { Config } from "tailwindcss";

// Color, radius and shadow tokens mirror landing-page/index.html's :root
// design system so the app and the marketing site read as one product.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        "bg-alt": "#F6F7FB",
        surface: "#FFFFFF",
        border: {
          DEFAULT: "#E7E9F0",
          strong: "#D7DBE6",
        },
        ink: {
          DEFAULT: "#0E1220",
          soft: "#5B6472",
          faint: "#96A0B1",
        },
        primary: {
          DEFAULT: "#2F5CE8",
          600: "#2447BE",
          contrast: "#FFFFFF",
          soft: "#EAF0FF",
          "soft-border": "#CBDBFF",
        },
        good: {
          DEFAULT: "#189A56",
          soft: "#E5F6ED",
        },
        purple: {
          DEFAULT: "#8B5CF6",
          soft: "#F1EAFE",
        },
        orange: {
          DEFAULT: "#E8623A",
          soft: "#FCEAE3",
        },
        dark: {
          DEFAULT: "#0B1220",
          panel: "#121B2E",
          line: "#26324B",
          text: "#E7ECF6",
          "text-soft": "#93A0B8",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        field: "10px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(14,18,32,0.05)",
        md: "0 2px 4px rgba(14,18,32,0.04), 0 12px 28px -10px rgba(14,18,32,0.12)",
        lg: "0 8px 16px rgba(14,18,32,0.06), 0 32px 64px -20px rgba(14,18,32,0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
