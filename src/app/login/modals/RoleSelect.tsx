'use client';

import {motion, AnimatePresence} from 'framer-motion';
import {ChefHat, User, CreditCard, ArrowLeft} from 'lucide-react';

interface RoleSelectProps {
    roles: string[];
    onRoleSelect: (role: string) => void;
    onBack: () => void;
}

export function RoleSelect({roles, onRoleSelect, onBack}: RoleSelectProps) {
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

    // Role-specific icons and colors
    const roleConfig = {
        chef: {
            icon: ChefHat,
            gradient: "from-orange-500 to-red-600 dark:from-orange-600 dark:to-red-800"
        },
        owner: {
            icon: User,
            gradient: "from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-800"
        },
        cashier: {
            icon: CreditCard,
            gradient: "from-green-500 to-teal-600 dark:from-green-600 dark:to-teal-800"
        }
    };

    // Function to get role configuration
    const getRoleConfig = (role: string) => {
        const roleLower = role.toLowerCase();
        return roleConfig[roleLower as keyof typeof roleConfig] || {
            icon: User,
            gradient: "from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800"
        };
    };

    return (
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
                    Select your Role
                </h2>

                <div className="flex justify-center items-center gap-4 flex-wrap">
                    {roles.map((role, index) => {
                        const {icon: RoleIcon, gradient} = getRoleConfig(role);

                        return (
                            <motion.div
                                key={index}
                                className={`relative min-w-[200px] overflow-hidden bg-gradient-to-br ${gradient} text-white rounded-xl shadow-md cursor-pointer flex flex-col items-center justify-center h-52`}
                                onClick={() => onRoleSelect(role)}
                                variants={cardVariants}
                                initial="initial"
                                animate="animate"
                                custom={index}
                                whileHover="hover"
                            >
                                {/* Decorative floating elements */}
                                <div className="absolute top-4 right-4 opacity-30">
                                    <RoleIcon size={24}/>
                                </div>

                                {/* Background pattern */}
                                <div className="absolute inset-0 opacity-10">
                                    <div
                                        className="absolute right-0 bottom-0 w-24 h-24 rounded-tl-full bg-white"></div>
                                    <div
                                        className="absolute left-6 top-6 w-12 h-12 rounded-full border border-white/30"></div>
                                </div>

                                {/* Main icon */}
                                <div className="mb-3 bg-white/20 p-4 rounded-full">
                                    <RoleIcon className="w-10 h-10"/>
                                </div>

                                {/* Role name */}
                                <h3 className="text-xl font-bold tracking-wide text-center px-4">
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                </h3>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}