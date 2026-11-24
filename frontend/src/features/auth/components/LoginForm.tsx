"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/firebase";
import { firebaseCode } from "@/features/auth/login-errors";
import { EmailField, PasswordField, SubmitButton } from "./LoginFields";

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
        <EmailField
            id={emailId}
            value={email}
            error={problems.email}
            onChange={(value) => {
                setEmail(value);
                setResetSent(false);
                setProblems((p) => ({ ...p, email: undefined }));
            }}
        />
    );
    const submitButton = (label: string, busyText: string) => <SubmitButton busy={busy} label={label} busyText={busyText} />;

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
                        <PasswordField
                            id={passwordId}
                            value={password}
                            error={problems.password}
                            autoComplete={canReset ? "current-password" : "new-password"}
                            onForgot={canReset ? () => showReset(true) : undefined}
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            onChange={(value) => {
                                setPassword(value);
                                setProblems((p) => ({ ...p, password: undefined }));
                            }}
                        />
                        {submitButton(submitLabel, busyLabel)}
                    </form>
                    {footer && <div className="mt-5">{footer}</div>}
                </>
            )}
        </div>
    );
}
