/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#c41e3a",
        "primary-dark": "#8b0000",
        bg: "#1a1a1a",
        surface: "#2d2d2d",
        "text-light": "#e0e0e0",
        "text-muted": "#888888",
      },
      fontFamily: {
        heading: ['"Bebas Neue"', '"Helvetica Neue"', "Arial", "sans-serif"],
        body: ['"Inter"', "Arial", "sans-serif"],
      },
      letterSpacing: {
        caps: "0.3em",
      },
      boxShadow: {
        glow: "0 12px 45px rgba(196, 30, 58, 0.35)",
      },
    },
  },
  plugins: [],
};
