"use client";

import { useState, FormEvent } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, type User, UserCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signup } from "@/features/auth/api";
import { motion } from "framer-motion";
import { Store, User as UserIcon, Mail, Lock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { CheckInbox } from "@/features/auth/components/CheckInbox";
import { PASSWORD_RULE, passwordProblem } from "@/features/auth/password-rule";
import { firebaseCode } from "@/features/auth/login-errors";
import SignupField from "./SignupField";

const SignupPage = () => {
    const router = useRouter();
    const [restaurantName, setRestaurantName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    // VM-13: signed up, waiting for the email to be verified
    const [unverified, setUnverified] = useState<User | null>(null);
    const [passwordError, setPasswordError] = useState(""); // SEC-08

    const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const problem = passwordProblem(password);
        setPasswordError(problem ?? "");
        if (problem) return;
        setLoading(true);

        try {
            const userCred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);

            // restaurant-service checks the Firebase ID token, then creates the restaurant
            // and gives this account the owner, cashier and chef roles.
            await signup({
                idToken: await userCred.user.getIdToken(),
                ownerName: ownerName,
                resName: restaurantName,
            });

            // VM-13: staff roles matched by email need it verified; ask now, while they're here
            await sendEmailVerification(userCred.user);
            setUnverified(userCred.user);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Signup error:", message);
            const code = firebaseCode(err);
            if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements") setPasswordError(PASSWORD_RULE);
            else alert("Error: " + message);
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
            transition: { duration: 0.6 },
        },
    };

    if (unverified)
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--stage)] text-[var(--ink)] px-4">
                <CheckInbox user={unverified} onVerified={() => router.push("/login")} />
            </div>
        );

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--stage)] text-[var(--ink)] px-4 relative">
            <motion.form
                initial="hidden"
                animate="visible"
                variants={formVariants}
                onSubmit={handleSignup}
                className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl shadow-xl p-8 max-w-md w-full flex flex-col gap-2.5"
            >
                <div className="relative z-10">
                    <div className="bg-blue-600 dark:bg-blue-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Store className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-2xl font-bold text-center text-zinc-800 dark:text-white mb-1">Create a Restaurant Account</h2>
                    <p className="text-center text-zinc-500 dark:text-zinc-400 mb-4">Get started with your restaurant management</p>
                </div>

                <SignupField label="Restaurant Name" icon={Store} type="text" value={restaurantName} onChange={setRestaurantName} />
                <SignupField label="Owner Name" icon={UserIcon} type="text" value={ownerName} onChange={setOwnerName} />
                <SignupField label="Email" icon={Mail} type="email" value={email} onChange={setEmail} />
                <SignupField
                    label="Password"
                    icon={Lock}
                    type="password"
                    value={password}
                    error={passwordError}
                    errorId="signup-password-error"
                    onChange={(value) => {
                        setPassword(value);
                        setPasswordError("");
                    }}
                >
                    {passwordError ? (
                        <p id="signup-password-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
                            {passwordError}
                        </p>
                    ) : (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">At least 8 characters, with a letter and a number.</p>
                    )}
                </SignupField>

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
                    Already have an account?{" "}
                    <a
                        onClick={() => {
                            router.push("/login");
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Log in
                    </a>
                </p>
            </motion.form>
        </div>
    );
};

export default SignupPage;
