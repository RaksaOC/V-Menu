"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fadeIn } from "./motion";

// The headline with the two calls to action and the dashboard picture, then the "Built with" strip.
export function HeroSection() {
    const router = useRouter();
    return (
        <>
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6 sm:px-16 overflow-hidden">
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
                    <div className="absolute top-40 -left-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div className="text-center max-w-3xl mx-auto" initial="hidden" animate="visible" variants={fadeIn}>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-6 leading-tight">
                            Modernize Your Restaurant Experience
                        </h1>
                        <p className="text-xl sm:text-2xl max-w-2xl mx-auto text-gray-700 dark:text-gray-300 mb-10">
                            V-Menu transforms how restaurants run with digital ordering, kitchen management, and cashier services — all in
                            one powerful platform.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a
                                onClick={() => router.push("/signup")}
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
                                {/* Real screenshot of the owner dashboard (local sample data) */}
                                <Image
                                    src="/images/landing/dashboard.png"
                                    alt="V-Menu owner dashboard with live restaurant stats"
                                    width={1440}
                                    height={830}
                                    priority
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>

                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full blur-2xl"></div>
                    </motion.div>
                </div>
            </section>

            {/* Clients Section */}
            <section className="py-12 px-6 sm:px-16 bg-gray-100 dark:bg-gray-800/50">
                <div className="max-w-7xl mx-auto">
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Built with</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                        {["Next.js", "Express", "TypeScript", "MongoDB", "Firebase Auth", "Prometheus"].map((brand) => (
                            <div key={brand} className="flex items-center justify-center h-10">
                                <span className="text-xl font-medium text-[var(--muted)]">{brand}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
