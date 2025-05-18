'use client';

import { useState, FormEvent } from "react";
import { createUserWithEmailAndPassword, UserCredential } from "firebase/auth";
import { auth } from "@/app/shared/firebase/config";
import axios from "axios";

const SignupPage = () => {
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

            // router.push("/dashboard");
        } catch (err: any) {
            console.error("Signup error:", err.message);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSignup}
            className="max-w-md mx-auto mt-24 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col gap-5"
        >
            <h2 className="text-2xl font-bold text-center text-zinc-800 dark:text-white">
                Create a Restaurant Account
            </h2>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Restaurant Name</label>
                <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white"
                    required
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Owner Name</label>
                <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white"
                    required
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white"
                    required
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition duration-200 ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
            >
                {loading ? "Creating..." : "Sign Up"}
            </button>
        </form>
    );
};

export default SignupPage;
