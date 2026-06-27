/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070914",
        inkSoft: "#0d1024",
        panel: "rgba(22,26,46,0.55)",
        panel2: "rgba(30,35,58,0.6)",
        line: "rgba(255,255,255,0.10)",
        lineGlow: "rgba(124,123,255,0.35)",
        paper: "#f3f1ff",
        cyan: "#22d3ee",
        violet: "#a78bfa",
        magenta: "#f472d0",
        accentDim: "#4c3d8f",
        accentSoft: "rgba(124,123,255,0.12)",
        win: "#34eab0",
        winDim: "#0f6e57",
        winSoft: "rgba(52,234,176,0.10)",
        loss: "#ff5f8f",
        lossDim: "#7a1f42",
        lossSoft: "rgba(255,95,143,0.10)",
        textDim: "#9aa0c4",
      },
      fontFamily: {
        display: ["'Anton'", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'Space Grotesk'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "16px",
        xl: "20px",
        "2xl": "26px",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(110deg, #22d3ee 0%, #a78bfa 50%, #f472d0 100%)",
        "mesh-1": "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.25), transparent 50%)",
        "mesh-2": "radial-gradient(circle at 80% 30%, rgba(167,139,250,0.25), transparent 50%)",
        "mesh-3": "radial-gradient(circle at 50% 80%, rgba(244,114,208,0.20), transparent 50%)",
      },
      animation: {
        "mesh-drift": "meshDrift 18s ease-in-out infinite",
        "glow-pulse": "glowPulse 2.4s ease-in-out infinite",
        "fade-up": "fadeUp 0.5s ease-out both",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      keyframes: {
        meshDrift: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(3%, -4%) scale(1.06)" },
          "66%": { transform: "translate(-3%, 3%) scale(0.96)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 14px 0 rgba(167,139,250,0.35), 0 0 0 1px rgba(167,139,250,0.25) inset" },
          "50%": { boxShadow: "0 0 34px 6px rgba(167,139,250,0.55), 0 0 0 1px rgba(167,139,250,0.4) inset" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
