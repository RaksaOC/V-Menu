import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

// The pieces of the login form (VM-14): the email and password fields and the submit button.

export function FieldError({ id, text }: { id: string; text?: string }) {
    if (!text) return null;
    return (
        <p id={id} className="mt-1 flex items-center text-sm text-red-500">
            <AlertCircle size={14} aria-hidden className="mr-1 shrink-0" />
            {text}
        </p>
    );
}

const ROOM_FOR_EYE = "pr-10"; // the show/hide button sits inside the field

const fieldClass = (bad: boolean, right: string) =>
    `w-full pl-10 ${right} py-3 rounded-xl bg-zinc-50/50 dark:bg-black/20 border focus:outline-none focus:ring-2 transition duration-200 text-zinc-800 dark:text-white ${
        bad ? "border-red-500 focus:ring-red-500" : "border-zinc-300 dark:border-zinc-700 focus:border-blue-500 focus:ring-blue-500"
    }`;

/** The email field. `error` shows under it; `onChange` gets the new value. */
export function EmailField({
    id,
    value,
    error,
    onChange,
}: {
    id: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Address
            </label>
            <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                    <Mail size={18} aria-hidden />
                </div>
                <input
                    type="email"
                    id={id}
                    name="email"
                    autoComplete="email"
                    placeholder="your@email.com"
                    value={value}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    className={fieldClass(Boolean(error), "pr-4")}
                />
            </div>
            <FieldError id={`${id}-error`} text={error} />
        </div>
    );
}

/** The password field with its show/hide button, and "Forgot password?" when `onForgot` is given. */
export function PasswordField({
    id,
    value,
    error,
    autoComplete,
    onForgot,
    onChange,
    showPassword,
    setShowPassword,
}: {
    id: string;
    value: string;
    error?: string;
    autoComplete: string;
    onForgot?: () => void;
    onChange: (value: string) => void;
    /** Kept by the form, so it survives a trip to "Forgot password?" and back. */
    showPassword: boolean;
    setShowPassword: (show: boolean) => void;
}) {
    const passwordBad = Boolean(error);
    return (
        <div className="space-y-1">
            <div className="mb-1 flex items-center justify-between">
                <label htmlFor={id} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                </label>
                {onForgot && (
                    <button
                        type="button"
                        onClick={onForgot}
                        className="text-sm font-medium text-[var(--accent-text)] hover:underline focus:outline-none focus-visible:underline"
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
                    id={id}
                    name="password"
                    autoComplete={autoComplete}
                    placeholder="••••••••"
                    value={value}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(e) => onChange(e.target.value)}
                    className={fieldClass(passwordBad, ROOM_FOR_EYE)}
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
            <FieldError id={`${id}-error`} text={error} />
        </div>
    );
}

/** The form's submit button, with a spinner while busy. */
export function SubmitButton({ busy, label, busyText }: { busy: boolean; label: string; busyText: string }) {
    return (
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
}
