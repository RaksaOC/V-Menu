// B6: e2e builds sign in against the Firebase Auth emulator instead of a real Firebase project.
// All three must hold: the E2E flag, the emulator's URL, and a "demo-" project (never a real one).
// The values are passed in explicitly because Next only inlines literal process.env.NEXT_PUBLIC_*.

export function authEmulatorUrl({ e2e, url, projectId }: { e2e?: string; url?: string; projectId?: string }): string | null {
    return e2e === "1" && url && projectId?.startsWith("demo-") ? url : null;
}

/** This build's emulator URL, or null (every real build). */
export const AUTH_EMULATOR_URL = authEmulatorUrl({
    e2e: process.env.NEXT_PUBLIC_E2E,
    url: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
