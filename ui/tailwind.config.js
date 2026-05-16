/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:  "#00417E",
          mid:   "#054E94",
          light: "#0A6BC4",
          glow:  "#1A8FFF",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "typing": "typing 1.2s steps(3) infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        typing:  { "0%,100%": { content: "." }, "33%": { content: ".." }, "66%": { content: "..." } },
      },
    },
  },
  plugins: [],
}
