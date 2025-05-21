'use client';

import { useEffect, useState } from 'react';
import './globals.css'
import { Sun, Moon, ChevronRight, Menu, X, Users, Clock, BarChart2, ShieldCheck, Settings, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import {useRouter} from "next/navigation";

export default function Home() {
    const router = useRouter();
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("theme") === "dark";
        }
        return true;
    });

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", darkMode);
        localStorage.setItem("theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // useEffect(() => {
    //     const lenis = new Lenis({
    //         duration: 1.2,
    //         lerp: 0.05,
    //     });
    //
    //     function raf(time: number) {
    //         lenis.raf(time);
    //         requestAnimationFrame(raf);
    //     }
    //
    //     requestAnimationFrame(raf);
    //
    //     return () => {
    //         lenis.destroy(); // cleanup on unmount
    //     };
    // }, []);


    const navItems = [
        { name: 'Features', href: '#features' },
        { name: 'How It Works', href: '#how-it-works' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Testimonials', href: '#testimonials' },
        { name: 'Contact', href: '#contact' },
    ];

    const fadeIn = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6 }
        }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-sans transition-colors duration-300">
            {/* Navigation */}
            <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-md' : 'bg-transparent'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4 md:py-6">
                        <div className="flex items-center">
                            <a href="#" className="flex items-center">
                                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center mr-3">
                                    <span className="text-xl font-bold text-white">V</span>
                                </div>
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">V-Menu</span>
                            </a>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center space-x-8">
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

                        <div className="hidden md:flex items-center space-x-4">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                aria-label="Toggle dark mode"
                                className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition"
                            >
                                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            <button onClick={() => router.replace('./login')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium px-4 py-2">
                                Log In
                            </button>

                            <a
                                onClick={() => router.replace('./signup')}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                            >
                                Sign Up Free
                            </a>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center space-x-4">
                            <button
                                onClick={() => setDarkMode(!darkMode)}
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
                                <a
                                    href="#"
                                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Log In
                                </a>
                                <a
                                    href="#"
                                    className="block px-3 py-2 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700 text-center"
                                >
                                    Sign Up Free
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 sm:px-16 overflow-hidden">
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-40 -left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        className="text-center max-w-3xl mx-auto"
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                    >
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-6 leading-tight">
                            Modernize Your Restaurant Experience
                        </h1>
                        <p className="text-xl sm:text-2xl max-w-2xl mx-auto text-gray-700 dark:text-gray-300 mb-10">
                            V-Menu transforms how restaurants run with digital ordering, kitchen management, and cashier services — all in one powerful platform.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                href="#"
                                className="w-full sm:w-auto py-3 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/20 focus:ring-4 focus:ring-blue-500/30 flex items-center justify-center gap-2 text-lg"
                            >
                                Create a Restaurant
                                <ChevronRight size={18} />
                            </a>
                            <a
                                href="#how-it-works"
                                className="w-full sm:w-auto py-3 px-8 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg font-medium transition-all duration-300 shadow-md text-lg"
                            >
                                See How It Works
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        className="mt-16 relative"
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-2xl shadow-blue-500/20 dark:shadow-blue-500/10">
                            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
                                <div className="h-80 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Dashboard Preview Image</p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full blur-2xl"></div>
                    </motion.div>
                </div>
            </section>

            {/* Clients Section */}
            <section className="py-12 px-6 sm:px-16 bg-gray-100 dark:bg-gray-800/50">
                <div className="max-w-7xl mx-auto">
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Trusted by restaurants worldwide</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                        {['Brand 1', 'Brand 2', 'Brand 3', 'Brand 4', 'Brand 5'].map((brand) => (
                            <div key={brand} className="flex items-center justify-center h-10">
                                <span className="text-xl font-medium text-gray-400 dark:text-gray-500">{brand}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="py-24 px-6 sm:px-20 bg-white dark:bg-gray-900 w-full">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeIn}>
                            <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                                Meet V-Menu: The Complete Restaurant Solution
                            </h2>
                            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                                V-Menu is a modern SaaS platform designed specifically for restaurants of all sizes. We combine ordering, kitchen management, and billing in one seamless experience.
                            </p>
                            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
                                Whether you're running a small café or managing multiple locations, our intuitive platform streamlines operations, reduces errors, and enhances the dining experience.
                            </p>
                            <a
                                href="#features"
                                className="text-blue-600 dark:text-blue-400 font-medium inline-flex items-center group"
                            >
                                Explore our features
                                <ChevronRight size={18} className="ml-1 transition-transform group-hover:translate-x-1" />
                            </a>
                        </motion.div>

                        <motion.div
                            className="relative"
                            variants={fadeIn}
                        >
                            <div className="aspect-square rounded-2xl overflow-hidden shadow-xl ring-1 ring-gray-200 dark:ring-gray-700">
                                <div className="h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Product Overview Image</p>
                                </div>
                            </div>
                            <div className="absolute -z-10 -bottom-6 -right-6 w-3/4 h-3/4 bg-blue-200/30 dark:bg-blue-900/20 rounded-2xl blur-xl"></div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 sm:px-20 bg-gray-50 dark:bg-gray-800">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeIn}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                            Powerful Features That Drive Results
                        </h2>
                        <p className="text-lg text-gray-700 dark:text-gray-300">
                            Everything you need to streamline operations and delight your customers in one unified platform.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        {[
                            {
                                icon: <BarChart2 className="h-6 w-6" />,
                                title: 'Real-Time Order Management',
                                desc: 'Track and update orders instantly, with automatic status updates for kitchen and servers.'
                            },
                            {
                                icon: <Users className="h-6 w-6" />,
                                title: 'Multi-Tenant Support',
                                desc: 'Seamlessly manage multiple branches or restaurant locations from a single dashboard.'
                            },
                            {
                                icon: <Clock className="h-6 w-6" />,
                                title: 'Smart Kitchen Display',
                                desc: 'Orders automatically flow to kitchen with prep timers and priority indicators.'
                            },
                            {
                                icon: <Settings className="h-6 w-6" />,
                                title: 'Efficient Cashier Mode',
                                desc: 'Streamlined billing, payment processing, and receipt generation with minimal clicks.'
                            },
                            {
                                icon: <ShieldCheck className="h-6 w-6" />,
                                title: 'Role-Based Access Control',
                                desc: 'Secure and tailored access for managers, servers, kitchen staff, and more.'
                            },
                            {
                                icon: <Star className="h-6 w-6" />,
                                title: 'Customer Engagement Tools',
                                desc: 'Collect feedback, manage loyalty programs, and personalize the dining experience.'
                            },
                        ].map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                className="group bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition duration-300 p-8 border border-gray-100 dark:border-gray-700 relative overflow-hidden"
                                variants={fadeIn}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-24 px-6 sm:px-20 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeIn}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                            How V-Menu Works
                        </h2>
                        <p className="text-lg text-gray-700 dark:text-gray-300">
                            Simple, intuitive, and powerful — from setup to daily operations
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {[
                            {
                                step: '01',
                                title: 'Setup Your Restaurant',
                                desc: 'Create your account, customize your menu, and configure your restaurant profile in minutes.'
                            },
                            {
                                step: '02',
                                title: 'Train Your Team',
                                desc: 'Our intuitive interface requires minimal training. Add staff members with appropriate access levels.'
                            },
                            {
                                step: '03',
                                title: 'Start Serving Efficiently',
                                desc: 'Take orders, manage kitchen flow, and process payments — all synchronized in real-time.'
                            },
                        ].map((item, index) => (
                            <motion.div
                                key={item.step}
                                className="flex flex-col"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeIn}
                                transition={{ delay: index * 0.2 }}
                            >
                                <div className="text-5xl font-bold text-blue-600/20 dark:text-blue-400/20 mb-4">{item.step}</div>
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">{item.desc}</p>
                                <div className="mt-auto">
                                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full" style={{ width: `${33.33 * (index + 1)}%` }}></div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-24 px-6 sm:px-20 bg-gray-50 dark:bg-gray-800 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeIn}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                            Restaurants Love V-Menu
                        </h2>
                        <p className="text-lg text-gray-700 dark:text-gray-300">
                            See what our customers have to say about their experience
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                quote: "V-Menu has transformed how we operate. Order errors are down 90% and our kitchen runs smoother than ever.",
                                name: "Sarah Johnson",
                                role: "Restaurant Owner, The Hungry Fork",
                                rating: 5
                            },
                            {
                                quote: "The multi-location support has been a game-changer for our small chain. We can monitor all our branches from one dashboard.",
                                name: "Michael Chen",
                                role: "Operations Manager, Urban Bites",
                                rating: 5
                            },
                            {
                                quote: "Setup was quick and the customer support team was there every step of the way. Best decision we made for our new restaurant.",
                                name: "Elena Rodriguez",
                                role: "General Manager, Sunset Grill",
                                rating: 5
                            }
                        ].map((testimonial, index) => (
                            <motion.div
                                key={testimonial.name}
                                className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 border border-gray-100 dark:border-gray-700 relative"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeIn}
                                transition={{ delay: index * 0.15 }}
                            >
                                <div className="text-5xl text-blue-500/20 dark:text-blue-400/20 absolute top-6 left-6 font-serif">"</div>
                                <div className="relative z-10">
                                    <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">{testimonial.quote}</p>
                                    <div className="flex items-center space-x-1 mb-4">
                                        {Array(testimonial.rating).fill().map((_, i) => (
                                            <Star key={i} size={18} className="text-yellow-500 fill-yellow-500" />
                                        ))}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6 sm:px-20 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeIn}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-lg text-gray-700 dark:text-gray-300">
                            Choose the plan that fits your restaurant's needs
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                name: "Starter",
                                price: "$49",
                                description: "Perfect for small cafés and food trucks",
                                features: [
                                    "1 restaurant location",
                                    "Up to 5 staff members",
                                    "Basic menu management",
                                    "Standard support",
                                    "7-day free trial"
                                ],
                                buttonText: "Start Free Trial",
                                highlight: false
                            },
                            {
                                name: "Professional",
                                price: "$99",
                                description: "Ideal for growing restaurants",
                                features: [
                                    "Up to 3 restaurant locations",
                                    "Unlimited staff members",
                                    "Advanced menu management",
                                    "Kitchen display system",
                                    "Priority support",
                                    "Customer analytics"
                                ],
                                buttonText: "Get Started",
                                highlight: true
                            },
                            {
                                name: "Enterprise",
                                price: "$249",
                                description: "For restaurant chains and franchises",
                                features: [
                                    "Unlimited restaurant locations",
                                    "Custom integrations",
                                    "Advanced reporting",
                                    "Dedicated account manager",
                                    "24/7 premium support",
                                    "White-label options"
                                ],
                                buttonText: "Contact Sales",
                                highlight: false
                            }
                        ].map((plan) => (
                            <motion.div
                                key={plan.name}
                                className={`rounded-xl overflow-hidden border ${
                                    plan.highlight
                                        ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10'
                                        : 'border-gray-200 dark:border-gray-700 shadow-md'
                                } transition-all duration-300 hover:shadow-xl ${
                                    plan.highlight ? 'relative z-10' : ''
                                }`}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeIn}
                            >
                                {plan.highlight && (
                                    <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
                                        Most Popular
                                    </div>
                                )}
                                <div className={`p-8 ${plan.highlight ? 'bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-900/20' : 'bg-white dark:bg-gray-900'}`}>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline mb-2">
                                        <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-2">/month</span>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">{plan.description}</p>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-center">
                                                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                                </svg>
                                                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <a
                                        href="#"
                                        className={`block w-full py-3 px-6 text-center rounded-lg font-medium transition-all duration-300 ${
                                            plan.highlight
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                                        }`}
                                    >
                                        {plan.buttonText}
                                    </a>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 sm:px-20 bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 text-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeIn}>
                            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                                Ready to Transform Your Restaurant Operations?
                            </h2>
                            <p className="text-xl opacity-90 mb-8 leading-relaxed">
                                Join thousands of restaurants that have streamlined their operations, increased efficiency, and improved customer satisfaction with V-Menu.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a
                                    href="#"
                                    className="py-3 px-8 bg-white text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-300 shadow-lg text-center"
                                >
                                    Start Your Free Trial
                                </a>
                                <a
                                    href="#contact"
                                    className="py-3 px-8 bg-transparent border border-white/30 hover:bg-white/10 text-white rounded-lg font-medium transition-all duration-300 text-center"
                                >
                                    Schedule a Demo
                                </a>
                            </div>
                        </motion.div>

                        <motion.div
                            className="relative flex justify-center lg:justify-end"
                            variants={fadeIn}
                        >
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 max-w-md">
                                <div className="flex items-center space-x-2 mb-4">
                                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                </div>
                                <div className="space-y-3">
                                    <div className="h-10 bg-white/10 rounded-md"></div>
                                    <div className="h-20 bg-white/10 rounded-md"></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="h-10 bg-white/10 rounded-md"></div>
                                        <div className="h-10 bg-white/10 rounded-md"></div>
                                    </div>
                                </div>
                                <div className="mt-4 px-4 py-2 bg-blue-500/20 rounded-md text-center text-sm font-medium">
                                    Get Started in Minutes
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 px-6 sm:px-20 bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="grid grid-cols-1 lg:grid-cols-2 gap-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeIn}>
                            <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                                Get in Touch
                            </h2>
                            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
                                Have questions or need assistance? Our team is here to help you get started with V-Menu.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Email</h3>
                                        <p className="text-gray-600 dark:text-gray-400">support@vmenu.com</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Phone</h3>
                                        <p className="text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Location</h3>
                                        <p className="text-gray-600 dark:text-gray-400">123 Restaurant Row, Suite 400<br />San Francisco, CA 94107</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-4">
                                {['twitter', 'facebook', 'instagram', 'linkedin'].map((social) => (
                                    <a
                                        key={social}
                                        href="#"
                                        className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <span className="sr-only">{social}</span>
                                        <div className="h-5 w-5">{/* Social icon would go here */}</div>
                                    </a>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div variants={fadeIn} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 shadow-md">
                            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">Send us a message</h3>
                            <form className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                        <input
                                            type="text"
                                            id="name"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                        <input
                                            type="email"
                                            id="email"
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="your.email@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        id="subject"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="How can we help?"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                                    <textarea
                                        id="message"
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Tell us about your restaurant and what you're looking for..."
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/30"
                                >
                                    Send Message
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 sm:px-20 bg-gray-50 dark:bg-gray-800">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeIn}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-lg text-gray-700 dark:text-gray-300">
                            Get answers to common questions about V-Menu
                        </p>
                    </motion.div>

                    <div className="space-y-6">
                        {[
                            {
                                question: "How long does it take to set up V-Menu?",
                                answer: "Most restaurants are up and running within a day. Our onboarding specialists help you configure your menu, staff roles, and settings to match your specific needs."
                            },
                            {
                                question: "Can I use V-Menu on tablets and mobile devices?",
                                answer: "Yes! V-Menu is fully responsive and works on tablets, smartphones, and desktop computers. We recommend tablets for servers and kitchen displays, while smartphones work well for managers on the go."
                            },
                            {
                                question: "Do you offer integration with payment processors?",
                                answer: "Absolutely. V-Menu integrates seamlessly with all major payment processors including Stripe, Square, PayPal, and many more. Custom integrations are available on our Enterprise plan."
                            },
                            {
                                question: "Is training included with my subscription?",
                                answer: "Yes, all plans include access to our training resources, including video tutorials and documentation. Professional and Enterprise plans include live training sessions for your team."
                            },
                            {
                                question: "Can I export my data and reports?",
                                answer: "Yes, V-Menu allows you to export all your data and reports in various formats including CSV, Excel, and PDF. This makes accounting and business analysis straightforward."
                            }
                        ].map((faq, index) => (
                            <motion.div
                                key={index}
                                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={fadeIn}
                                transition={{ delay: index * 0.1 }}
                            >
                                <details className="group">
                                    <summary className="flex items-center justify-between cursor-pointer px-6 py-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{faq.question}</h3>
                                        <span className="ml-6 flex-shrink-0 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform duration-300">
                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                            </svg>
                                        </span>
                                    </summary>
                                    <div className="px-6 pb-4 text-gray-600 dark:text-gray-400">
                                        <p>{faq.answer}</p>
                                    </div>
                                </details>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 dark:bg-black text-white pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-6 sm:px-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                        <div className="lg:col-span-2">
                            <div className="flex items-center mb-6">
                                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center mr-3">
                                    <span className="text-xl font-bold text-white">V</span>
                                </div>
                                <span className="text-2xl font-bold text-blue-400">V-Menu</span>
                            </div>
                            <p className="text-gray-400 mb-6 max-w-md">
                                Modern restaurant management software that streamlines operations, reduces errors, and enhances the dining experience.
                            </p>
                            <div className="flex space-x-4">
                                {['twitter', 'facebook', 'instagram', 'linkedin'].map((social) => (
                                    <a
                                        key={social}
                                        href="#"
                                        className="h-10 w-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                    >
                                        <span className="sr-only">{social}</span>
                                        <div className="h-5 w-5">{/* Social icon would go here */}</div>
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-6">Product</h3>
                            <ul className="space-y-4">
                                {['Features', 'Pricing', 'Integrations', 'Updates', 'Roadmap'].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-6">Company</h3>
                            <ul className="space-y-4">
                                {['About Us', 'Careers', 'Press', 'Partners', 'Contact'].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-6">Resources</h3>
                            <ul className="space-y-4">
                                {['Documentation', 'Tutorials', 'Blog', 'Support Center', 'API Docs'].map((item) => (
                                    <li key={item}>
                                        <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors">
                                            {item}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8 mt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center">
                            <p className="text-gray-500 text-sm mb-4 md:mb-0">
                                © {new Date().getFullYear()} V-Menu. All rights reserved.
                            </p>
                            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-gray-500">
                                <a href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
                                <a href="#" className="hover:text-blue-400 transition-colors">Terms of Service</a>
                                <a href="#" className="hover:text-blue-400 transition-colors">Cookie Policy</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}