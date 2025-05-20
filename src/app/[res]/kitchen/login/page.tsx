'use client';

import {useState, FormEvent} from "react";
import {useParams, useRouter} from "next/navigation";
import {signInWithEmailAndPassword} from "firebase/auth";
import {auth} from "@/app/shared/firebase/config";
import {Eye, EyeOff} from "lucide-react";
import api from "@/app/shared/lib/axios";

const Auth = () => {
    const router = useRouter();
    const params = useParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            const response = await api.post(`/api/kitchen/login`, {
                email: email,
                resSlug: params.res,
                uid: userCredential.user.uid,
            });

            localStorage.setItem("token", response.data.appToken);
            console.log("After response we have the token", localStorage.getItem("token"));

            console.log("Login successful");

            router.replace(`./`);
        } catch (err: any) {
            console.error("Login error:", err.message);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleLogin}
            className="max-w-sm mx-auto mt-32 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col gap-5"
        >
            <h2 className="text-2xl font-bold text-center text-zinc-800 dark:text-white">
                Kitchen Login
            </h2>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>

            <div className="flex flex-col gap-1 relative">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Password</label>
                <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="px-4 py-2 pr-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-9 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-xl transition duration-200 cursor-pointer ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
            >
                {loading ? "Logging in..." : "Login"}
            </button>

            <button
                type="button"
                onClick={() => router.push(`/${params.res}/cashier/auth/signup`)}
                className="text-sm text-center text-blue-600 hover:underline mt-2 cursor-pointer"
            >
                Don't have an account? Sign up
            </button>
        </form>
    );
};

export default Auth;
