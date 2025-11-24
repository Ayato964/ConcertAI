/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0f172a', // Slate 900
                surface: '#1e293b', // Slate 800
                primary: '#3b82f6', // Blue 500
                secondary: '#64748b', // Slate 500
                accent: '#8b5cf6', // Violet 500
                text: '#f8fafc', // Slate 50
                muted: '#94a3b8', // Slate 400
                border: '#334155', // Slate 700
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
