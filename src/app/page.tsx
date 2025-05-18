'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function Home() {
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    return (
        <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-white font-sans transition-colors duration-300">
            {/* Theme Toggle */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 transition"
                >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            {/* Hero Section */}
            <section className="flex flex-col items-center justify-center text-center py-24 px-8 sm:px-16">
                <h1 className="text-4xl sm:text-6xl font-bold mb-4 text-blue-600 dark:text-blue-400">
                    V-Menu
                </h1>
                <p className="text-lg sm:text-xl max-w-xl text-gray-700 dark:text-gray-300">
                    Your restaurant’s digital ordering, kitchen, and cashier system in one powerful app.
                </p>
            </section>

            {/* About Section */}
            <section className="py-16 px-8 sm:px-20 bg-gray-100 dark:bg-gray-800 w-full">
                <h2 className="text-3xl font-semibold mb-6 text-blue-600 dark:text-blue-400">About V-Menu</h2>
                <p className="max-w-2xl text-gray-700 dark:text-gray-300">
                    V-Menu is a modern SaaS solution for restaurants. Handle orders, manage kitchens, and speed up cashier operations – all from one unified platform.
                </p>
            </section>

            {/* Features Section */}
            <section className="py-20 px-8 sm:px-20">
                <h2 className="text-3xl font-semibold text-center text-blue-600 dark:text-blue-400 mb-12">
                    Features
                </h2>
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-center">
                    {[
                        ['Easy Order Management', 'Track and update orders in real-time.'],
                        ['Multi-Tenant Support', 'Manage multiple branches or restaurants.'],
                        ['Kitchen Display', 'Orders auto-flow to the kitchen for faster prep.'],
                        ['Cashier Mode', 'Efficient billing & payments system.'],
                        ['Role-Based Access', 'Secure access for kitchen, cashier & admins.'],
                        ['Responsive Design', 'Works great on tablet and desktop.'],
                    ].map(([title, desc]) => (
                        <div key={title} className="bg-blue-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm hover:shadow-md transition">
                            <h3 className="text-xl font-medium text-blue-700 dark:text-blue-300 mb-2">{title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} V-Menu. All rights reserved.
            </footer>
        </div>
    );
}