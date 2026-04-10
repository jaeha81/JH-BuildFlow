import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#5B8DEF",
        warn:  "#FF6B6B",
        ok:    "#4ADE80",
        gold:  "#FFE566",
      },
    },
  },
  plugins: [],
};

export default config;
