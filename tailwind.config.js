/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs du logo — strictement inchangées
        brand: {
          DEFAULT: "#f22222",
          dark: "#c81c1c",
          light: "#ffe3e0",
        },
        forest: {
          DEFAULT: "#096338",
          dark: "#074a2a",
          light: "#dcf5e6",
        },
        // Palette complémentaire, vibrante — pour donner du relief
        azure: {
          DEFAULT: "#155dfc",
          dark: "#0d3fb0",
          light: "#dbe9ff",
        },
        gold: {
          DEFAULT: "#f5a623",
          light: "#fef0d9",
        },
        ink: "#161a1e",
      },
      fontFamily: {
        heading: ["'Lora'", "serif"],
        sans: ["'Inter'", "sans-serif"],
      },
      // Angles resserrés partout (esprit document/plan, pas appli bulle) :
      // rounded-lg/xl/2xl deviennent tous discrets plutôt que très ronds.
      borderRadius: {
        lg: "0.25rem",
        xl: "0.375rem",
        "2xl": "0.5rem",
        full: "9999px",
      },
      // Les ombres douces uniformes sont l'un des tics les plus
      // reconnaissables d'un design généré — on les réduit à presque
      // rien, au profit des bordures (traits fins) comme relief principal.
      boxShadow: {
        card: "0 1px 2px rgba(22,26,30,0.05)",
        "card-hover": "0 1px 2px rgba(22,26,30,0.05)",
        glow: "0 8px 30px rgba(242,34,34,0.25)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
        gradientShift: "gradientShift 8s ease infinite",
      },
    },
  },
  plugins: [],
};
