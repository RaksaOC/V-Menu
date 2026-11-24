/** SEC-08: what a new password needs. It matches the Firebase password policy (infra/deploy/README.md). */
export const PASSWORD_RULE = "Use at least 8 characters, with a letter and a number";

/** The rule's message when a new password breaks it. Only for setting a password, never for signing in. */
export function passwordProblem(password: string): string | undefined {
    const ok = [...password].length >= 8 && /\p{L}/u.test(password) && /\p{N}/u.test(password);
    return ok ? undefined : PASSWORD_RULE;
}
