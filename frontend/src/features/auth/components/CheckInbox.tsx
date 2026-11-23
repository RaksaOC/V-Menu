"use client";

import { useState } from "react";
import { reload, sendEmailVerification, type User } from "firebase/auth";
import { MailCheck } from "lucide-react";

interface Props {
    /** The signed-in Firebase user whose email isn't verified yet. */
    user: User;
    /** Runs once Firebase says the email is verified. */
    onVerified: () => void | Promise<void>;
}

/**
 * "Check your inbox": shown after a verification email was sent, until the email is verified
 * (VM-13). Used by the owner sign-up and by /login, where invited staff create their account (VM-12).
 */
export function CheckInbox({ user, onVerified }: Props) {
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    async function checkVerified() {
        setNote("");
        setBusy(true);
        try {
            await reload(user);
            if (user.emailVerified) await onVerified();
            else setNote("Not verified yet. Open the link in the email, then try again.");
        } catch {
            setNote("Couldn't check just now. Try again in a moment.");
        } finally {
            setBusy(false);
        }
    }

    async function sendAgain() {
        try {
            await sendEmailVerification(user);
            setNote("Sent again. It can take a minute to arrive.");
        } catch {
            setNote("Couldn't send it just now. Wait a minute and try again.");
        }
    }

    return (
        <section className="w-full max-w-md space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-8 text-center shadow-xl">
            <MailCheck size={40} aria-hidden className="mx-auto text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold">Check your inbox</h1>
            <p className="text-sm text-[var(--muted)]">
                We sent a link to <strong className="text-[var(--ink)]">{user.email}</strong>. Open it to verify your email, then come back
                here.
            </p>
            {note && (
                <p role="status" className="rounded-xl bg-[var(--card)] px-3 py-2 text-sm">
                    {note}
                </p>
            )}
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={checkVerified}
                    disabled={busy}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-medium text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-70"
                >
                    I&apos;ve verified my email
                </button>
                <button
                    type="button"
                    onClick={sendAgain}
                    className="rounded-xl border border-[var(--line)] px-4 py-3 font-medium hover:bg-[var(--card)]"
                >
                    Send it again
                </button>
            </div>
        </section>
    );
}
