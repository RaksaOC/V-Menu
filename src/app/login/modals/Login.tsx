import {useState} from "react";
import {toast} from "react-toastify";
import {signInWithEmailAndPassword} from "firebase/auth";
import {auth} from "@/app/shared/firebase/config";
import api from "@/app/shared/lib/axios";
import {Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, ArrowRight} from "lucide-react";

export interface LoginDetails{
    email: string,
    uid: string,
}

interface Props {
    onSuccess: (logInDetails: LoginDetails, data: Record<string, string[]>) => void;
    onRegisterClick?: () => void;
}

export function Login({onSuccess, onRegisterClick}: Props) {
    const [form, setForm] = useState({email: "", password: ""});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({...form, [e.target.name]: e.target.value});
        // Clear error when user types
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
            const response = await api.post("/api/login", {email: form.email});
            const logInDetail = {
                email: form.email,
                uid: userCredential.user.uid
            }
            onSuccess(logInDetail, response.data);
        } catch (err: any) {
            console.error("Login error:", err.message);
            toast.error("Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: string) => {
        setLoading(true);
        try {
            // Placeholder for future social login implementation
            toast.info(`${provider} login will be implemented soon`);
        } catch (err: any) {
            console.error(`${provider} login error:`, err.message);
            toast.error(err?.message || `${provider} login failed`);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        // Placeholder for forgot password functionality
        toast.info("Password reset functionality will be implemented soon");
    };

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold text-center mb-6">Welcome Back</h2>

            <form onSubmit={handleSubmit} className="space-y-5 mb-5">
                <div className="space-y-1">
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email Address
                    </label>
                    <div className="relative">
                        <div
                            className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                            <Mail size={18}/>
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
                            <AlertCircle size={14} className="mr-1"/>
                            {formErrors.email}
                        </div>
                    )}
                </div>

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
                        <div
                            className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                            <Lock size={18}/>
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

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition duration-300 flex items-center justify-center ${
                        loading
                            ? "bg-blue-600/70 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
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

            <div className="relative flex items-center my-6">
                <div className="flex-grow border-t border-gray-700"></div>
                <span className="flex-shrink mx-3 text-sm text-gray-400">or continue with</span>
                <div className="flex-grow border-t border-gray-700"></div>
            </div>

            <div className="flex space-x-3">
                <button
                    onClick={() => handleSocialLogin("Google")}
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center bg-white text-gray-800 hover:bg-gray-100"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                        <path fill="none" d="M1 1h22v22H1z"/>
                    </svg>
                </button>

                <button
                    onClick={() => handleSocialLogin("Facebook")}
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path
                            d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                    </svg>
                </button>

                <button
                    onClick={() => handleSocialLogin("Github")}
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center bg-gray-800 text-white hover:bg-gray-900"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path
                            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                </button>
            </div>

            <div className="mt-6 text-center text-sm text-gray-400">
                Don't have an account?{" "}
                <button
                    type="button"
                    onClick={onRegisterClick}
                    className="text-blue-400 hover:text-blue-300 font-medium focus:outline-none"
                >
                    Create one now
                </button>
            </div>

            {/* Terms of service note */}
            <p className="mt-6 text-xs text-center text-gray-500">
                By continuing, you agree to our{" "}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                    Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-400 hover:text-blue-300">
                    Privacy Policy
                </a>
                .
            </p>
        </div>
    );
}