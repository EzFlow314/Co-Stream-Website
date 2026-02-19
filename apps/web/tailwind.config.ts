import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx,css}"],
  theme: {
    extend: {
      colors: {
        ezbg0: "rgb(var(--ez-bg0) / <alpha-value>)",
        ezbg1: "rgb(var(--ez-bg1) / <alpha-value>)",
        ezpanel: "rgb(var(--ez-panel) / <alpha-value>)",
        ezborder: "rgb(var(--ez-border) / <alpha-value>)",
        eztext: "rgb(var(--ez-text) / <alpha-value>)",
        ezmuted: "rgb(var(--ez-muted) / <alpha-value>)",
        ezaccent: "rgb(var(--ez-accent) / <alpha-value>)",
        ezaccent2: "rgb(var(--ez-accent2) / <alpha-value>)",
        ezdanger: "rgb(var(--ez-danger) / <alpha-value>)",
        ezsuccess: "rgb(var(--ez-success) / <alpha-value>)"
      }
    }
  },
  plugins: []
};

export default config;
