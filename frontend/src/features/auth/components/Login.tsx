import { useState } from "react";
import { toast } from "@/lib/toast";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getMemberships } from "@/features/auth/api";
import { CheckInbox } from "@/features/auth/components/CheckInbox";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export interface LoginDetails {
    email: string;
    idToken: string; // Firebase ID token; restaurant-service verifies it
}

interface Props {
    onSuccess: (logInDetails: LoginDetails, data: Record<string, string[]>) => void;
}

/** Firebase's answer for an email that already has an account. */
const errorCode = (err: unknown) => (err as { code?: string } | null)?.code ?? "";

export function Login({ onSuccess }: Props) {
    // VM-12: invited staff create their account here ("create"); everyone else signs in
    const [mode, setMode] = useState<"signin" | "create">("signin");
    // VM-13: an account whose email isn't verified yet, waiting on "Check your inbox"
    const [unverified, setUnverified] = useState<User | null>(null);
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

    /** On to choosing a restaurant and role, with a token that says what Firebase knows now. */
    async function carryOn(user: User, fresh = false) {
        const idToken = await user.getIdToken(fresh);
        onSuccess({ email: form.email.toLowerCase(), idToken }, await getMemberships(idToken));
    }

    /** Asks Firebase to email a verification link; the panel's "Send it again" covers a failure. */
    async function askToVerify(user: User) {
        try {
            await sendEmailVerification(user);
        } catch (err) {
            console.error("Verification email:", errorCode(err));
        }
        setUnverified(user);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        try {
            if (mode === "create") {
                const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
                await askToVerify(user);
                return;
            }
            const { user } = await signInWithEmailAndPassword(auth, form.email, form.password);
            const idToken = await user.getIdToken();
            const memberships = await getMemberships(idToken);
            // VM-13: an invite only counts once the email is verified, so with no roles yet that's
            // the likely reason; an account that already has roles (an owner) goes straight on
            if (!user.emailVerified && Object.keys(memberships).length === 0) {
                await askToVerify(user);
                return;
            }
            onSuccess({ email: form.email.toLowerCase(), idToken }, memberships);
        } catch (err) {
            const code = errorCode(err);
            console.error("Login error:", code);
            if (code === "auth/email-already-in-use") setFormErrors({ email: "This email already has an account. Sign in instead." });
            else if (code === "auth/weak-password") setFormErrors({ password: "Choose a stronger password" });
            else toast.error(mode === "create" ? "Couldn't create the account" : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    function switchMode() {
        setMode(mode === "signin" ? "create" : "signin");
        setFormErrors({});
    }

    // after "I've verified my email": a fresh token, since the old one still says unverified
    if (unverified) return <CheckInbox user={unverified} onVerified={() => carryOn(unverified, true)} />;

    const handleForgotPassword = () => {
        toast.info("Password reset functionality will be implemented soon");
    };

    return (
        <div className="bg-[var(--bg)] border border-[var(--line)] rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h2 className="text-3xl font-bold text-center mb-6">{mode === "create" ? "Create your account" : "V-Menu Log In"}</h2>
            {mode === "create" && (
                <p className="-mt-3 mb-5 text-center text-sm text-[var(--muted)]">
                    Invited by a restaurant? Use the email they invited. We&apos;ll send a link to verify it.
                </p>
            )}

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
                        {mode === "signin" && (
                            <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
                            >
                                Forgot Password?
                            </button>
                        )}
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
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
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
                            {mode === "create" ? "Creating..." : "Logging in..."}
                        </>
                    ) : (
                        <>
                            {mode === "create" ? "Create account" : "Login"}
                            <ArrowRight size={18} className="ml-2" />
                        </>
                    )}
                </button>
            </form>
            <p className="text-center text-sm text-[var(--muted)]">
                {mode === "signin" ? "New staff member? " : "Already have an account? "}
                <button type="button" onClick={switchMode} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                    {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
            </p>
        </div>
    );
}
