/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#06070B",
        panel: "#0F1725",
        ink: "#D7E0F1",
        safe: "#45F882",
        danger: "#FF5C7A",
        alert: "#FFAA5C",
        accent: "#43D9FF",
      },
      boxShadow: {
        glass: "0 20px 60px rgba(0, 0, 0, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
