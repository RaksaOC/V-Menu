'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

interface RoleOption {
    label: string;
    route: string; // e.g. `/vmenu/joes-diner/kitchen`
}

interface Restaurant {
    id: string;
    name: string;
    roles: RoleOption[];
}

interface ResSelectProps {
    isOpen: boolean;
    onClose: () => void;
    restaurants: Restaurant[];
}

export function ResSelect({ isOpen, onClose, restaurants }: ResSelectProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 60 }}
                    >
                        <div
                            className="bg-white dark:bg-[#121212] rounded-2xl shadow-2xl p-6 w-full max-w-3xl relative"
                            onClick={(e) => e.stopPropagation()} // prevent backdrop click
                        >
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
                                onClick={onClose}
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <h2 className="text-2xl font-semibold text-center text-gray-800 dark:text-white mb-6">
                                Select a Restaurant & Role
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {restaurants.map((res) => (
                                    <div
                                        key={res.id}
                                        className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-xl p-4 shadow-md hover:shadow-lg transition"
                                    >
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                                            {res.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {res.roles.map((role) => (
                                                <a
                                                    key={role.label}
                                                    href={role.route}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg transition"
                                                >
                                                    {role.label}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
