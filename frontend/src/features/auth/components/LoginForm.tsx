"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { auth } from "@/lib/firebase";
import { firebaseCode } from "@/features/auth/login-errors";

/** What went wrong with a submit: next to a field, or as a notice above the form. */
export interface LoginProblems {
    email?: string;
    password?: string;
    notice?: string;
}

interface Props {
    title: string;
    /** A line under the title. */
    intro?: ReactNode;
    /** Shown above the fields, e.g. "Your session ended". */
    top?: ReactNode;
    /** Shown under the form, e.g. a link to create an account. */
    footer?: ReactNode;
    submitLabel?: string;
    busyLabel?: string;
    /** Offer "Forgot password?". Off while creating an account. */
    canReset?: boolean;
    /** An extra rule for the password, for forms that set one. Sign-in only needs it filled in. */
    checkPassword?: (password: string) => string | undefined;
    onSubmit: (email: string, password: string) => Promise<LoginProblems | void>;
}

const SENT = "If that email has an account, we sent a link.";

function emailProblem(email: string) {
    if (!email.trim()) return "Email is required";
    return /\S+@\S+\.\S+/.test(email) ? undefined : "Please enter a valid email address";
}

function FieldError({ id, text }: { id: string; text?: string }) {
    if (!text) return null;
    return (
        <p id={id} className="mt-1 flex items-center text-sm text-red-500">
            <AlertCircle size={14} aria-hidden className="mr-1 shrink-0" />
            {text}
        </p>
    );
}

const fieldClass = (bad: boolean, right: string) =>
    `w-full pl-10 ${right} py-3 rounded-xl bg-zinc-50/50 dark:bg-black/20 border focus:outline-none focus:ring-2 transition duration-200 text-zinc-800 dark:text-white ${
        bad ? "border-red-500 focus:ring-red-500" : "border-zinc-300 dark:border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
    }`;

/**
 * VM-14: the one login form, used by /login and the owner, cashier and kitchen login pages. It
 * holds the email and password fields, their checks and the "Forgot password?" flow.
 */
export function LoginForm({
    title,
    intro,
    top,
    footer,
    submitLabel = "Login",
    busyLabel = "Logging in...",
    canReset = true,
    checkPassword,
    onSubmit,
}: Props) {
    const emailId = useId();
    const passwordId = useId();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [problems, setProblems] = useState<LoginProblems>({});
    const [resetting, setResetting] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // switching between signing in and creating an account starts with a clean slate
    useEffect(() => setProblems({}), [title]);

    async function submit(e: FormEvent) {
        e.preventDefault();
        const found: LoginProblems = {
            email: emailProblem(email),
            password: password ? checkPassword?.(password) : "Password is required",
        };
        setProblems(found);
        if (found.email || found.password) return;
        setBusy(true);
        try {
            setProblems((await onSubmit(email.trim(), password)) ?? {});
        } finally {
            setBusy(false);
        }
    }

    async function sendReset(e: FormEvent) {
        e.preventDefault();
        const bad = emailProblem(email);
        setProblems(bad ? { email: bad } : {});
        setResetSent(false);
        if (bad) return;
        setBusy(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setResetSent(true);
        } catch (err) {
            // the same answer whether or not the account exists; only a dead connection is different,
            // because then nothing was sent and it says nothing about the email
            if (firebaseCode(err) === "auth/network-request-failed")
                setProblems({ notice: "Couldn't reach the server. Check your connection and try again." });
            else setResetSent(true);
        } finally {
            setBusy(false);
        }
    }

    function showReset(on: boolean) {
        setResetting(on);
        setResetSent(false);
        setProblems({});
    }

    const notice = problems.notice && (
        <p role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {problems.notice}
        </p>
    );

    const emailField = (
        <div className="space-y-1">
            <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Address
            </label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <Mail size={18} aria-hidden />
                </div>
                <input
                    type="email"
                    id={emailId}
                    name="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={email}
                    aria-invalid={problems.email ? true : undefined}
                    aria-describedby={problems.email ? `${emailId}-error` : undefined}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        setResetSent(false);
                        setProblems((p) => ({ ...p, email: undefined }));
                    }}
                    className={fieldClass(Boolean(problems.email), "pr-4")}
                />
            </div>
            <FieldError id={`${emailId}-error`} text={problems.email} />
        </div>
    );

    const submitButton = (label: string, busyText: string) => (
        <button
            type="submit"
            disabled={busy}
            className={`flex w-full items-center justify-center rounded-xl px-4 py-3 font-semibold text-white transition duration-300 ${
                busy ? "cursor-not-allowed bg-blue-600/70" : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
            {busy ? (
                <>
                    <Loader2 size={18} aria-hidden className="mr-2 animate-spin" />
                    {busyText}
                </>
            ) : (
                <>
                    {label}
                    <ArrowRight size={18} aria-hidden className="ml-2" />
                </>
            )}
        </button>
    );

    return (
        <div data-login-form className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-8 shadow-xl">
            {resetting ? (
                <>
                    <h2 className="mb-2 text-center text-3xl font-bold text-zinc-800 dark:text-white">Reset your password</h2>
                    <p className="mb-5 text-center text-sm text-[var(--muted)]">Enter your email and we&apos;ll send a reset link.</p>
                    {notice}
                    {resetSent && (
                        <p role="status" className="mb-5 rounded-xl bg-[var(--card)] px-4 py-3 text-center text-sm font-medium">
                            {SENT}
                        </p>
                    )}
                    <form onSubmit={sendReset} className="space-y-5" noValidate>
                        {emailField}
                        {submitButton("Send reset link", "Sending...")}
                    </form>
                    <button
                        type="button"
                        onClick={() => showReset(false)}
                        className="mx-auto mt-5 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                        <ArrowLeft size={16} aria-hidden />
                        Back to login
                    </button>
                </>
            ) : (
                <>
                    <h2 className={`text-center text-3xl font-bold text-zinc-800 dark:text-white ${intro ? "mb-2" : "mb-6"}`}>{title}</h2>
                    {intro && <p className="mb-5 text-center text-sm text-[var(--muted)]">{intro}</p>}
                    {top}
                    {notice}
                    <form onSubmit={submit} className="space-y-5" noValidate>
                        {emailField}
                        <div className="space-y-1">
                            <div className="mb-1 flex items-center justify-between">
                                <label htmlFor={passwordId} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Password
                                </label>
                                {canReset && (
                                    <button
                                        type="button"
                                        onClick={() => showReset(true)}
                                        className="text-sm font-medium text-blue-600 hover:underline focus:outline-none focus-visible:underline dark:text-blue-400"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                                    <Lock size={18} aria-hidden />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id={passwordId}
                                    name="password"
                                    autoComplete={canReset ? "current-password" : "new-password"}
                                    placeholder="••••••••"
                                    value={password}
                                    aria-invalid={problems.password ? true : undefined}
                                    aria-describedby={problems.password ? `${passwordId}-error` : undefined}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setProblems((p) => ({ ...p, password: undefined }));
                                    }}
                                    className={fieldClass(Boolean(problems.password), "pr-10")}
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition duration-200 hover:text-zinc-600 focus:outline-none dark:hover:text-zinc-200"
                                >
                                    {showPassword ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                                </button>
                            </div>
                            <FieldError id={`${passwordId}-error`} text={problems.password} />
                        </div>
                        {submitButton(submitLabel, busyLabel)}
                    </form>
                    {footer && <div className="mt-5">{footer}</div>}
                </>
            )}
        </div>
    );
}
