import { BarChart2, BarChart4, Clock, Settings, ShieldCheck, Users } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer } from "./motion";

// Six feature cards.
export function FeaturesSection() {
    return (
        <section id="features" className="py-24 px-6 sm:px-20 bg-gray-50 dark:bg-gray-800">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    className="text-center max-w-3xl mx-auto mb-16"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeIn}
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-[var(--accent-text)] mb-6">Powerful Features That Drive Results</h2>
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
                            title: "Real-Time Order Management",
                            desc: "Track and update orders instantly, with automatic status updates for kitchen and servers.",
                        },
                        {
                            icon: <Users className="h-6 w-6" />,
                            title: "Multi-Tenant Support",
                            desc: "Seamlessly manage multiple branches or restaurants locations from a single dashboard.",
                        },
                        {
                            icon: <Clock className="h-6 w-6" />,
                            title: "Smart Kitchen Display",
                            desc: "Orders automatically flow to kitchen with prep timers and priority indicators.",
                        },
                        {
                            icon: <Settings className="h-6 w-6" />,
                            title: "Efficient Cashier Mode",
                            desc: "Streamlined billing, payment processing, and receipt generation with minimal clicks.",
                        },
                        {
                            icon: <ShieldCheck className="h-6 w-6" />,
                            title: "Role-Based Access Control",
                            desc: "Secure and tailored access for owners, kitchen staff, cashier and more.",
                        },
                        {
                            icon: <BarChart4 className="h-6 w-6" />,
                            title: "Performance Insights",
                            desc: "Track sales trends, monitor staff activity, and gain valuable insights to make informed business decisions.",
                        },
                    ].map((feature) => (
                        <motion.div
                            key={feature.title}
                            className="group bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition duration-300 p-8 border border-gray-100 dark:border-gray-700 relative overflow-hidden"
                            variants={fadeIn}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[var(--accent-text)] mb-6">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
