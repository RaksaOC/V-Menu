"use client";

import { useRouter } from "next/navigation";
import { sendEmailVerification, signInWithEmailAndPassword, type User } from "firebase/auth";
import { ToastHost } from "@/components/ui";
import { auth } from "@/lib/firebase";
import { apiErrorMessage, apiStatus } from "@/lib/api";
import { toast } from "@/lib/toast";
import { login, type StaffRole } from "@/features/auth/api";
import { signInMessage } from "@/features/auth/login-errors";
import { LoginForm, type LoginProblems } from "@/features/auth/components/LoginForm";
import SessionEndedNotice from "@/features/auth/components/SessionEndedNotice";

interface Props {
    title: string;
    role: StaffRole;
    /** The restaurant, for cashiers and chefs. */
    resSlug?: string;
    /** Where to go once signed in. */
    next: string;
}

/** VM-14: the owner, cashier and kitchen login pages: the shared form, for one role. */
export default function RoleLogin({ title, role, resSlug, next }: Props) {
    const router = useRouter();

    async function signIn(email: string, password: string): Promise<LoginProblems | void> {
        let user: User;
        try {
            ({ user } = await signInWithEmailAndPassword(auth, email, password));
        } catch (err) {
            toast.error(signInMessage(err));
            return;
        }
        try {
            await login({ idToken: await user.getIdToken(), role, ...(resSlug ? { resSlug } : {}) });
            router.push(next);
        } catch (err) {
            // VM-13: an invite only counts once the email is verified, so that's the likely reason
            if (role !== "owner" && apiStatus(err) === 401 && !user.emailVerified) {
                await sendEmailVerification(user).catch(() => {}); // they can sign in again to get another
                return { notice: `Verify your email first. We sent a link to ${user.email}. Open it, then log in again.` };
            }
            toast.error(apiErrorMessage(err, "Couldn't sign in. Please try again."));
        }
    }

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-[var(--stage)] px-4 text-[var(--ink)]">
            <ToastHost />
            <LoginForm title={title} top={<SessionEndedNotice />} onSubmit={signIn} />
        </div>
    );
}
