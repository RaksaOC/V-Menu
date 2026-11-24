import { motion } from "framer-motion";
import { fadeIn } from "./motion";

// The three steps from setup to serving.
export function HowItWorksSection() {
    return (
        <section id="how-it-works" className="py-24 px-6 sm:px-20 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    className="text-center max-w-3xl mx-auto mb-16"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeIn}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6">How V-Menu Works</h2>
                    <p className="text-lg text-gray-700 dark:text-gray-300">
                        Simple, intuitive, and powerful — from setup to daily operations
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {[
                        {
                            step: "01",
                            title: "Setup Your Restaurant.ts",
                            desc: "Create your account, customize your menu, create tables and configure your restaurants in minutes.",
                        },
                        {
                            step: "02",
                            title: "Add Your Team",
                            desc: "Easily invite team members and assign roles with the right permissions—no training required, thanks to our intuitive interface.",
                        },
                        {
                            step: "03",
                            title: "Start Serving Efficiently",
                            desc: "Take orders, manage kitchen flow, and process payments — all digitally synchronized in real-time.",
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
                                    <div
                                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                                        style={{ width: `${33.33 * (index + 1)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
