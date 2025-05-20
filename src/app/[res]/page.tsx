'use client';

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Res() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fadeInUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0 },
    };

    const sectionProps = {
        variants: fadeInUp,
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true },
        transition: { duration: 0.6, ease: "easeOut" },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white relative overflow-x-hidden">
            {/* Gradient Background Effects */}
            <div className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl top-[-8rem] left-[-10rem] z-0" />
            <div className="absolute w-[300px] h-[300px] bg-indigo-400/20 rounded-full blur-2xl bottom-[-5rem] right-[-5rem] z-0" />

            {/* Hero */}
            <motion.section
                className="relative z-10 text-center py-24 px-4"
                initial={{ opacity: 0, y: 50 }}
                animate={mounted ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, ease: "easeOut" }}
            >
                <h1 className="text-5xl font-extrabold mb-4 tracking-tight">
                    Welcome to Ocean Bites
                </h1>
                <p className="text-gray-300 max-w-xl mx-auto text-lg">
                    Where modern ambiance meets authentic flavors. Your culinary escape awaits.
                </p>
            </motion.section>

            {/* About */}
            <motion.section
                {...sectionProps}
                className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center"
            >
                <h2 className="text-3xl font-semibold mb-4">About Us</h2>
                <p className="text-gray-400 text-md">
                    Ocean Bites is more than a restaurant — it's a modern dining experience.
                    Located in the heart of the city, we serve gourmet meals crafted from fresh, local ingredients.
                    Join us for a casual lunch or a romantic dinner in our cozy, modern space.
                </p>
            </motion.section>

            {/* Gallery */}
            <motion.section
                {...sectionProps}
                className="relative z-10 max-w-5xl mx-auto px-6 py-16"
            >
                <h2 className="text-3xl font-semibold text-center mb-8">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="rounded-xl overflow-hidden hover:scale-[1.03] transition-transform shadow-lg"
                        >
                            <Image
                                src={`/placeholder/gallery${i}.jpg`} // use real images here
                                alt={`Gallery ${i}`}
                                width={500}
                                height={300}
                                className="object-cover w-full h-48"
                            />
                        </div>
                    ))}
                </div>
            </motion.section>

            {/* Menu Highlights */}
            <motion.section
                {...sectionProps}
                className="relative z-10 max-w-5xl mx-auto px-6 py-16"
            >
                <h2 className="text-3xl font-semibold text-center mb-8">Signature Dishes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {["Seared Salmon", "Truffle Pasta", "Gourmet Burger"].map((item, idx) => (
                        <div
                            key={idx}
                            className="bg-white/10 p-4 rounded-xl text-center hover:scale-[1.02] transition-transform border border-white/10"
                        >
                            <Image
                                src={`/placeholder/food${idx + 1}.jpg`}
                                alt={item}
                                width={300}
                                height={200}
                                className="rounded-lg mb-4 object-cover w-full h-36"
                            />
                            <h3 className="font-bold text-lg text-white">{item}</h3>
                            <p className="text-sm text-gray-300">A customer favorite packed with flavor.</p>
                        </div>
                    ))}
                </div>
            </motion.section>

            {/* Testimonials */}
            <motion.section
                {...sectionProps}
                className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center"
            >
                <h2 className="text-3xl font-semibold mb-8">What Our Guests Say</h2>
                <div className="space-y-8">
                    {[
                        "Best dining experience I’ve had in a long time!",
                        "The ambiance is unmatched and the food is divine.",
                        "Perfect date night spot. We’ll be back again soon!"
                    ].map((quote, i) => (
                        <blockquote
                            key={i}
                            className="bg-white/5 border border-white/10 rounded-xl p-6 text-gray-300 italic"
                        >
                            “{quote}”
                        </blockquote>
                    ))}
                </div>
            </motion.section>

            {/* Call to Action */}
            <motion.section
                {...sectionProps}
                className="relative z-10 text-center py-20 px-6"
            >
                <h2 className="text-4xl font-bold mb-4">Ready to Taste the Difference?</h2>
                <p className="text-gray-400 mb-6">Reserve your table today or view our live menu.</p>
                <div className="flex justify-center gap-4">
                    <button className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-xl font-medium text-white transition">
                        Reserve Now
                    </button>
                    <button className="bg-transparent border border-white px-6 py-3 rounded-xl font-medium text-white hover:bg-white/10 transition">
                        View Menu
                    </button>
                </div>
            </motion.section>
        </div>
    );
}
