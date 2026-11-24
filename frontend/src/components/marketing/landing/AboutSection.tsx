import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { fadeIn, staggerContainer } from "./motion";

// What V-Menu is, next to the kitchen screen and the customer's phone.
export function AboutSection() {
    return (
        <section className="py-24 px-6 sm:px-20 bg-white dark:bg-gray-900 w-full" id={"about"}>
            <div className="max-w-7xl mx-auto">
                <motion.div
                    className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeIn}>
                        <h2 className="text-3xl sm:text-4xl font-bold text-[var(--accent-text)] mb-6">
                            Meet V-Menu: The Complete Restaurant Solution
                        </h2>
                        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                            V-Menu is a modern SaaS platform designed specifically for restaurants of all sizes. We combine ordering,
                            kitchen management, and billing in one seamless experience.
                        </p>
                        <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
                            Whether you&apos;re running a small café or managing multiple locations, our intuitive platform streamlines
                            operations, reduces errors, and enhances the dining experience.
                        </p>
                        <a href="#features" className="text-[var(--accent-text)] font-medium inline-flex items-center group">
                            Explore our features
                            <ChevronRight size={18} className="ml-1 transition-transform group-hover:translate-x-1" />
                        </a>
                    </motion.div>

                    <motion.div className="relative" variants={fadeIn}>
                        <div className="aspect-square rounded-2xl overflow-hidden shadow-xl ring-1 ring-gray-200 dark:ring-gray-700">
                            {/* Kitchen screen with the customer's phone menu on top: the two ends of one order */}
                            <div className="relative h-full bg-gray-100 dark:bg-gray-800">
                                <Image
                                    src="/images/landing/kitchen.png"
                                    alt="Kitchen screen listing a table's pending order"
                                    fill
                                    sizes="(min-width: 1024px) 600px, 100vw"
                                    className="object-cover object-left-top"
                                />
                                <div className="absolute bottom-4 right-4 w-[38%] overflow-hidden rounded-[1.4rem] border-[5px] border-gray-900 bg-white shadow-2xl">
                                    <Image
                                        src="/images/landing/customer-phone.png"
                                        alt="Customer menu on a phone after scanning the table's QR code"
                                        width={390}
                                        height={844}
                                        className="w-full h-auto"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="absolute -z-10 -bottom-6 -right-6 w-3/4 h-3/4 bg-blue-200/30 dark:bg-blue-900/20 rounded-2xl blur-xl"></div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
