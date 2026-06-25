/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0c10",
        inkSoft: "#11141a",
        panel: "#161a22",
        panel2: "#1d222c",
        line: "#272d3a",
        lineGold: "#3d3420",
        paper: "#f5f2ea",
        gold: "#D4AF37",
        goldDim: "#7a6420",
        goldSoft: "#241f10",
        pitch: "#0f3d2e",
        win: "#34d399",
        winDim: "#155e44",
        winSoft: "#0b2118",
        loss: "#f87171",
        lossDim: "#7f1d1d",
        lossSoft: "#250d0d",
        textDim: "#8a93a3",
      },
      fontFamily: {
        display: ["'Anton'", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'Space Grotesk'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
      },
    },
  },
  plugins: [],
};
