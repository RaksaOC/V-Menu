'use client';

import {useState, FormEvent} from "react";
import {signInWithEmailAndPassword, createUserWithEmailAndPassword, UserCredential} from "firebase/auth";
import {auth} from "@/app/shared/firebase/config";
import {Eye, EyeOff} from "lucide-react";
import {useRouter} from "next/router";

const Auth = () => {
    // const router = useRouter();

    const [isLogin, setIsLogin] = useState<boolean>(true);
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            let userCred: UserCredential;

            if (isLogin) {
                userCred = await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                userCred = await signInWithEmailAndPassword(auth, email, password);
            }

            const token = await userCred.user.getIdToken();
            localStorage.setItem("token", "Bearer " + token);

            console.log("Successfully logged in");

            // await router.push("/dashboard");
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleAuth}
            className="max-w-sm mx-auto mt-32 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl flex flex-col gap-5"
        >
            <h2 className="text-2xl font-bold text-center text-zinc-800 dark:text-white">
                {isLogin ? "Admin Login" : "Create Account"}
            </h2>

            <div className="flex flex-col gap-1">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Email</label>
                <input
                    type="email"
                    onChange={(e) => setEmail(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>

            <div className="flex flex-col gap-1 relative">
                <label className="text-sm text-zinc-700 dark:text-zinc-300">Password</label>
                <input
                    type={showPassword ? "text" : "password"}
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
                {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
            </button>

            <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-center text-blue-600 hover:underline mt-2 cursor-pointer"
            >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
        </form>
    );
};

export default Auth;
