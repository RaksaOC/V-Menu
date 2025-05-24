import { useState } from "react";
import { toast } from "react-toastify";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/shared/firebase/config";
import api from "@/app/shared/lib/axios";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export interface LoginDetails {
    email: string;
    uid: string;
}

interface Props {
    onSuccess: (logInDetails: LoginDetails, data: Record<string, string[]>) => void;
}

export function Login({ onSuccess }: Props) {
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        if (formErrors[e.target.name as keyof typeof formErrors]) {
            setFormErrors({ ...formErrors, [e.target.name]: undefined });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
            const response = await api.post("/api/login", { email: form.email.toLowerCase() });
            const logInDetail = {
                email: form.email.toLowerCase(),
                uid: userCredential.user.uid,
            };
            onSuccess(logInDetail, response.data);
        } catch (err: any) {
            console.error("Login error:", err.message);
            toast.error("Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        toast.info("Password reset functionality will be implemented soon");
    };

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold text-center mb-6">Welcome Back</h2>

            <form onSubmit={handleSubmit} className="space-y-5 mb-5">
                {/* Email */}
                <div className="space-y-1">
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email Address
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                            <Mail size={18} />
                        </div>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            placeholder="your@email.com"
                            value={form.email}
                            onChange={handleChange}
                            className={`w-full pl-10 pr-4 py-3 rounded-lg bg-black/20 border focus:outline-none focus:ring-2 ${
                                formErrors.email
                                    ? "border-red-500 focus:ring-red-500"
                                    : "border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                            }`}
                        />
                    </div>
                    {formErrors.email && (
                        <div className="flex items-center text-red-500 text-sm mt-1">
                            <AlertCircle size={14} className="mr-1" />
                            {formErrors.email}
                        </div>
                    )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                        <label htmlFor="password" className="block text-sm font-medium">
                            Password
                        </label>
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                            <Lock size={18} />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            id="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            className={`w-full pl-10 pr-10 py-3 rounded-lg bg-black/20 border focus:outline-none focus:ring-2 ${
                                formErrors.password
                                    ? "border-red-500 focus:ring-red-500"
                                    : "border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 focus:outline-none"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {formErrors.password && (
                        <div className="flex items-center text-red-500 text-sm mt-1">
                            <AlertCircle size={14} className="mr-1" />
                            {formErrors.password}
                        </div>
                    )}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition duration-300 flex items-center justify-center ${
                        loading ? "bg-blue-600/70 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin mr-2" />
                            Logging in...
                        </>
                    ) : (
                        <>
                            Login
                            <ArrowRight size={18} className="ml-2" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
