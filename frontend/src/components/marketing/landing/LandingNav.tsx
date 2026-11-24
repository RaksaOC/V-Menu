"use client";

import { useEffect, useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useRouter } from "next/navigation";

const navItems = [
    { name: "Home", href: "#" },
    { name: "About", href: "#about" },
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
];

// The fixed top bar: links, theme switch, tour, log in and sign up, and the phone menu.
export function LandingNav({ onOpenTour }: { onOpenTour: () => void }) {
    const router = useRouter();
    // Same theme switch as the rest of the app: .dark class + data-theme, saved as "vm-theme".
    const [darkMode, setDarkMode] = useState(false);
    useEffect(() => setDarkMode(document.documentElement.classList.contains("dark")), []);
    const toggleTheme = () => {
        const next = !darkMode;
        const root = document.documentElement;
        root.classList.toggle("dark", next);
        root.dataset.theme = next ? "dark" : "light";
        try {
            localStorage.setItem("vm-theme", next ? "dark" : "light");
        } catch {}
        setDarkMode(next);
    };

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md" : "bg-transparent"}`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4 md:py-6">
                    <div className="flex items-center">
                        <a href="#" className="flex items-center">
                            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center mr-3">
                                <span className="text-xl font-bold text-white">V</span>
                            </div>
                            <span className="text-xl font-bold text-[var(--accent-text)]">V-Menu</span>
                        </a>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-8">
                        {navItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                            >
                                {item.name}
                            </a>
                        ))}
                    </nav>

                    <div className="hidden lg:flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle dark mode"
                            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button
                            onClick={onOpenTour}
                            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-2"
                        >
                            Tour
                        </button>

                        <button
                            onClick={() => router.push("/login")}
                            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-2"
                        >
                            Log In
                        </button>

                        <a
                            onClick={() => {
                                router.push("/signup");
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                        >
                            Sign Up Free
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle dark mode"
                            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.name}
                            </a>
                        ))}
                        <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2 flex flex-col space-y-2">
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    onOpenTour();
                                }}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
                            >
                                Tour
                            </button>
                            <a
                                onClick={() => router.push("/login")}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-center"
                            >
                                Log In
                            </a>
                            <a
                                onClick={() => router.push("/signup")}
                                className="block px-3 py-2 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700 text-center"
                            >
                                Sign Up Free
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
