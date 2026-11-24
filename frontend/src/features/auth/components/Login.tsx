import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, type User } from "firebase/auth";
import { toast } from "@/lib/toast";
import { auth } from "@/lib/firebase";
import { getMemberships } from "@/features/auth/api";
import { firebaseCode, signInMessage } from "@/features/auth/login-errors";
import { PASSWORD_RULE, passwordProblem } from "@/features/auth/password-rule";
import { CheckInbox } from "@/features/auth/components/CheckInbox";
import { LoginForm, type LoginProblems } from "@/features/auth/components/LoginForm";

export interface LoginDetails {
    email: string;
    idToken: string; // Firebase ID token; restaurant-service verifies it
}

interface Props {
    onSuccess: (logInDetails: LoginDetails, data: Record<string, string[]>) => void;
}

export function Login({ onSuccess }: Props) {
    // VM-12: invited staff create their account here ("create"); everyone else signs in
    const [mode, setMode] = useState<"signin" | "create">("signin");
    // VM-13: an account whose email isn't verified yet, waiting on "Check your inbox"
    const [unverified, setUnverified] = useState<User | null>(null);
    const creating = mode === "create";

    /** On to choosing a restaurant and role, with a token that says what Firebase knows now. */
    async function carryOn(user: User) {
        const idToken = await user.getIdToken(true);
        onSuccess({ email: (user.email ?? "").toLowerCase(), idToken }, await getMemberships(idToken));
    }

    /** Asks Firebase to email a verification link; the panel's "Send it again" covers a failure. */
    async function askToVerify(user: User) {
        try {
            await sendEmailVerification(user);
        } catch (err) {
            console.error("Verification email:", firebaseCode(err));
        }
        setUnverified(user);
    }

    async function createAccount(email: string, password: string): Promise<LoginProblems | void> {
        try {
            const { user } = await createUserWithEmailAndPassword(auth, email, password);
            await askToVerify(user);
        } catch (err) {
            const code = firebaseCode(err);
            console.error("Create account error:", code);
            if (code === "auth/email-already-in-use") return { email: "This email already has an account. Sign in instead." };
            if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements") return { password: PASSWORD_RULE };
            toast.error("Couldn't create the account");
        }
    }

    async function signIn(email: string, password: string): Promise<LoginProblems | void> {
        try {
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            const idToken = await user.getIdToken();
            const memberships = await getMemberships(idToken);
            // VM-13: an invite only counts once the email is verified, so with no roles yet that's
            // the likely reason; an account that already has roles (an owner) goes straight on
            if (!user.emailVerified && Object.keys(memberships).length === 0) await askToVerify(user);
            else onSuccess({ email: email.toLowerCase(), idToken }, memberships);
        } catch (err) {
            console.error("Login error:", firebaseCode(err));
            toast.error(signInMessage(err));
        }
    }

    // after "I've verified my email": a fresh token, since the old one still says unverified
    if (unverified) return <CheckInbox user={unverified} onVerified={() => carryOn(unverified)} />;

    return (
        <LoginForm
            title={creating ? "Create your account" : "V-Menu Log In"}
            intro={creating ? "Invited by a restaurant? Use the email they invited. We'll send a link to verify it." : undefined}
            submitLabel={creating ? "Create account" : "Login"}
            busyLabel={creating ? "Creating..." : "Logging in..."}
            canReset={!creating}
            checkPassword={creating ? passwordProblem : undefined}
            onSubmit={creating ? createAccount : signIn}
            footer={
                <p className="text-center text-sm text-[var(--muted)]">
                    {creating ? "Already have an account? " : "New staff member? "}
                    <button
                        type="button"
                        onClick={() => setMode(creating ? "signin" : "create")}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                        {creating ? "Sign in" : "Create an account"}
                    </button>
                </p>
            }
        />
    );
}
