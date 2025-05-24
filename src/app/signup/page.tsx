'use client';

import { useState, FormEvent } from "react";
import { createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { auth } from "@/app/shared/firebase/config";
import axios from "axios";
import { motion } from "framer-motion";
import { Store, User, Mail, Lock, ArrowRight } from "lucide-react";
import {useRouter} from "next/navigation";

const SignupPage = () => {
    const router = useRouter();
    const [restaurantName, setRestaurantName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userCred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;
            const token = await userCred.user.getIdToken();

            // Step 1: Create restaurant + user document in MongoDB
            const res = await axios.post("/api/signup", {
                ownerName: ownerName,
                resName: restaurantName,
                email: email,
                tenantId: uid
            });

            // Step 2: Store token + resId
            localStorage.setItem("token", token);

            console.log("Signup complete", { uid });

            router.push("/login");
        } catch (err: any) {
            console.error("Signup error:", err.message);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Animation variants
    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6 }
        }
    };

    const inputVariants = {
        focus: { scale: 1.02, boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" },
        blur: { scale: 1, boxShadow: "none" }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-950 to-slate-900 text-white px-4 relative">
            <motion.form
                initial="hidden"
                animate="visible"
                variants={formVariants}
                onSubmit={handleSignup}
                className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col gap-2.5"
            >

                <div className="relative z-10">
                    <div className="bg-blue-600 dark:bg-blue-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Store className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-2xl font-bold text-center text-zinc-800 dark:text-white mb-1">
                        Create a Restaurant Account
                    </h2>
                    <p className="text-center text-zinc-500 dark:text-zinc-400 mb-4">
                        Get started with your restaurant management
                    </p>
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Restaurant Name
                    </label>
                    <motion.input
                        type="text"
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-white focus:outline-none"
                        required
                        whileFocus="focus"
                        whileTap="focus"
                        variants={inputVariants}
                    />
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Owner Name
                    </label>
                    <motion.input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-white focus:outline-none"
                        required
                        whileFocus="focus"
                        whileTap="focus"
                        variants={inputVariants}
                    />
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                    </label>
                    <motion.input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-white focus:outline-none"
                        required
                        whileFocus="focus"
                        whileTap="focus"
                        variants={inputVariants}
                    />
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Password
                    </label>
                    <motion.input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-white focus:outline-none"
                        required
                        whileFocus="focus"
                        whileTap="focus"
                        variants={inputVariants}
                    />
                </div>

                <motion.button
                    type="submit"
                    disabled={loading}
                    className={`mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 relative z-10 ${
                        loading ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {loading ? (
                        <>
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>Creating...</span>
                        </>
                    ) : (
                        <>
                            <span>Sign Up</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </motion.button>

                <p className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-2 relative z-10">
                    Already have an account? <a onClick={() => {router.push("/login")}} className="text-blue-600 dark:text-blue-400 hover:underline">Log in</a>
                </p>
            </motion.form>
        </div>
    );
};

export default SignupPage;