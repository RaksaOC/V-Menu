/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./src/**/*.{js,ts,jsx,tsx}", // adjust for your folder structure
    ],
    darkMode: 'class', // enables 'dark' class strategy
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#2563eb',   // brand-blue
                    light: '#3b82f6',     // blue-500
                    dark: '#1d4ed8',      // blue-700
                },
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                xl: '1rem',
                '2xl': '1.5rem',
            },
            boxShadow: {
                soft: '0 2px 8px rgba(0, 0, 0, 0.05)',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),      // for styled form elements
        require('@tailwindcss/typography'), // for prose / content
        require('@tailwindcss/aspect-ratio') // for media/layout
    ],
};
