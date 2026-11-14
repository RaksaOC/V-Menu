'use client';

import {motion, AnimatePresence} from 'framer-motion';
import {Utensils, Store, ArrowLeft} from 'lucide-react';

interface ResSelectProps {
    restaurantNames: string[];
    onSelected: (slug: string) => void;
    onBack: () => void;
}

export function ResSelect({restaurantNames, onSelected, onBack}: ResSelectProps) {
    // Card animation variants
    const cardVariants = {
        initial: {opacity: 0, y: 20},
        animate: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.3,
            }
        }),
        hover: {
            scale: 1.05,
            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)",
            transition: {duration: 0.2}
        }
    };

    return (
        <AnimatePresence>
            <>

                <div
                    className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {(
                        <button
                            onClick={onBack}
                            className={`flex items-center self-start gap-2 text-white hover:text-blue-400 transition-colors`}
                        >
                            <ArrowLeft className="w-5 h-5"/> Back
                        </button>
                    )}
                    <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">
                        Select Restaurant
                    </h2>

                    <div className="flex justify-center items-center gap-4 flex-wrap">
                        {restaurantNames.map((name, index) => (
                            <motion.div
                                key={index}
                                className="relative min-w-[200px] overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white rounded-xl shadow-md cursor-pointer flex flex-col items-center justify-center h-52"
                                onClick={() => onSelected(name)}
                                variants={cardVariants}
                                initial="initial"
                                animate="animate"
                                custom={index}
                                whileHover="hover"
                            >
                                {/* Decorative floating elements */}
                                <div className="absolute top-4 right-4 opacity-30">
                                    <Store size={24}/>
                                </div>

                                {/* Background pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute right-0 bottom-0 w-24 h-24 rounded-tl-full bg-white"></div>
                                    <div
                                        className="absolute left-6 top-6 w-12 h-12 rounded-full border border-white/30"></div>
                                </div>

                                {/* Main icon */}
                                <div className="mb-3 bg-white/20 p-4 rounded-full">
                                    <Utensils className="w-10 h-10"/>
                                </div>

                                {/* Restaurant.ts name */}
                                <h3 className="text-xl font-bold tracking-wide text-center px-4">
                                    {name.split(" - ")[0]}
                                </h3>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </>
        </AnimatePresence>
    );
}