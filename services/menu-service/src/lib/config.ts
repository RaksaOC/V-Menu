// Reads required settings once at start-up and stops with a clear message when one is missing.
export function requireEnv(...names: string[]) {
    const missing = names.filter((n) => !process.env[n]);
    if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")} (see .env.example)`);
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be at least 32 characters");
}
