'use client';

import {useState, FormEvent} from "react";
import {useParams, useRouter} from "next/navigation";
import {signInWithEmailAndPassword} from "firebase/auth";
import {auth} from "@/app/shared/firebase/config";
import {Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, ArrowRight} from "lucide-react";
import api from "@/app/shared/lib/axios";

const Auth = () => {
    const router = useRouter();
    const params = useParams();
    const [form, setForm] = useState({email: "", password: ""});
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({...form, [e.target.name]: e.target.value});
        if (formErrors[e.target.name as keyof typeof formErrors]) {
            setFormErrors({...formErrors, [e.target.name]: undefined});
        }
    };

    const validateForm = () => {
        const errors: { email?: string; password?: string } = {};

        if (!form.email) {
            errors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            errors.email = "Please enter a valid email address";
        }

        if (!form.password) {
            errors.password = "Password is required";
        } else if (form.password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);

            const response = await api.post("/api/cashier/login", {
                email: form.email.toLowerCase(),
                resSlug: params.res,
                uid: userCredential.user.uid,
            });

            localStorage.setItem("token", response.data.appToken);
            console.log("After response we have the token", localStorage.getItem("token"));

            console.log("Login successful");

            router.push(`${params.res}/cashier/dashboard`);
        } catch (err: any) {
            console.error("Login error:", err.message);
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={"w-full min-h-screen flex justify-center items-center bg-gradient-to-tr from-blue-950 to-slate-900 text-white px-4 relative"}>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full">
                <h2 className="text-3xl font-bold text-center text-zinc-800 dark:text-white mb-6">
                    Cashier Login
                </h2>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Email */}
                    <div className="space-y-1">
                        <label htmlFor="email"
                               className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <div
                                className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                                <Mail size={18}/>
                            </div>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                placeholder="your@email.com"
                                value={form.email}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50/50 dark:bg-black/20 border focus:outline-none focus:ring-2 transition duration-200 text-zinc-800 dark:text-white ${
                                    formErrors.email
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-zinc-300 dark:border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
                                }`}
                            />
                        </div>
                        {formErrors.email && (
                            <div className="flex items-center text-red-500 text-sm mt-1">
                                <AlertCircle size={14} className="mr-1"/>
                                {formErrors.email}
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <label htmlFor="password"
                               className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <div
                                className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                                <Lock size={18}/>
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                id="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                className={`w-full pl-10 pr-10 py-3 rounded-xl bg-zinc-50/50 dark:bg-black/20 border focus:outline-none focus:ring-2 transition duration-200 text-zinc-800 dark:text-white ${
                                    formErrors.password
                                        ? "border-red-500 focus:ring-red-500"
                                        : "border-zinc-300 dark:border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 focus:outline-none transition duration-200"
                            >
                                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                            </button>
                        </div>
                        {formErrors.password && (
                            <div className="flex items-center text-red-500 text-sm mt-1">
                                <AlertCircle size={14} className="mr-1"/>
                                {formErrors.password}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition duration-300 flex items-center justify-center mt-6 ${
                            loading ? "bg-blue-600/70 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                        }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin mr-2"/>
                                Logging in...
                            </>
                        ) : (
                            <>
                                Login
                                <ArrowRight size={18} className="ml-2"/>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>

    );
};

export default Auth;