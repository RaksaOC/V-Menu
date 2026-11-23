"use client";

import { useState, FormEvent } from "react";
import { createUserWithEmailAndPassword, reload, sendEmailVerification, type User, UserCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signup } from "@/features/auth/api";
import { motion } from "framer-motion";
import { Store, User as UserIcon, Mail, Lock, ArrowRight, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";

const SignupPage = () => {
    const router = useRouter();
    const [restaurantName, setRestaurantName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    // VM-13: signed up, waiting for the email to be verified
    const [unverified, setUnverified] = useState<User | null>(null);
    const [note, setNote] = useState("");

    const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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
        } catch (err: any) {
            console.error("Signup error:", err.message);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    async function checkVerified() {
        if (!unverified) return;
        setNote("");
        await reload(unverified);
        if (unverified.emailVerified) router.push("/login");
        else setNote("Not verified yet. Open the link in the email, then try again.");
    }

    async function sendAgain() {
        if (!unverified) return;
        try {
            await sendEmailVerification(unverified);
            setNote("Sent again. It can take a minute to arrive.");
        } catch {
            setNote("Couldn't send it just now. Wait a minute and try again.");
        }
    }

    // Animation variants
    const formVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6 },
        },
    };

    const inputVariants = {
        focus: { scale: 1.02, boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" },
        blur: { scale: 1, boxShadow: "none" },
    };

    if (unverified)
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--stage)] text-[var(--ink)] px-4">
                <section className="w-full max-w-md space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-8 text-center shadow-xl">
                    <MailCheck size={40} aria-hidden className="mx-auto text-blue-600 dark:text-blue-400" />
                    <h1 className="text-2xl font-bold">Check your inbox</h1>
                    <p className="text-sm text-[var(--muted)]">
                        We sent a link to <strong className="text-[var(--ink)]">{unverified.email}</strong>. Open it to verify your email,
                        then come back here.
                    </p>
                    {note && (
                        <p role="status" className="rounded-xl bg-[var(--card)] px-3 py-2 text-sm">
                            {note}
                        </p>
                    )}
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={checkVerified}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-medium text-white hover:from-blue-700 hover:to-indigo-700"
                        >
                            I&apos;ve verified my email
                        </button>
                        <button
                            type="button"
                            onClick={sendAgain}
                            className="rounded-xl border border-[var(--line)] px-4 py-3 font-medium hover:bg-[var(--card)]"
                        >
                            Send it again
                        </button>
                    </div>
                </section>
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
                        <UserIcon className="w-4 h-4" />
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
