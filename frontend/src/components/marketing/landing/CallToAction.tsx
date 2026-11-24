import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "./motion";

// The closing "Ready to transform" band.
export function CallToAction() {
    return (
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
                        <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to Transform Your Restaurant Operations?</h2>
                        <p className="text-xl opacity-90 mb-8 leading-relaxed">
                            Join restaurants that have streamlined their operations, increased efficiency, and improved customer
                            satisfaction with V-Menu.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <a
                                href="#"
                                className="py-3 px-8 bg-white text-[var(--accent-text)] hover:bg-blue-50 rounded-lg font-medium transition-all duration-300 shadow-lg text-center"
                            >
                                Start Your Free Trial
                            </a>
                        </div>
                    </motion.div>

                    <motion.div className="hidden relative lg:flex justify-center lg:justify-end" variants={fadeIn}>
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
    );
}
