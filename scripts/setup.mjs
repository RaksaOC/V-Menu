// npm run setup: installs every package and writes each service's .env from its .env.example,
// with one freshly generated JWT_SECRET and INTERNAL_API_KEY shared by all three services.
// Existing .env files are never overwritten.
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const services = ["restaurant-service", "menu-service", "order-service"];
const secret = () => randomBytes(32).toString("base64url");
const shared = { JWT_SECRET: secret(), INTERNAL_API_KEY: secret() };

// Reuse the Firebase project id the frontend already has, if any.
const frontEnv = existsSync("frontend/.env.local") ? readFileSync("frontend/.env.local", "utf8") : "";
const projectId = frontEnv.match(/^NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)$/m)?.[1]?.trim();

for (const dir of ["frontend", ...services.map((s) => `services/${s}`)]) {
    console.log(`\n> npm install (${dir})`);
    execSync("npm install --no-audit --no-fund", { cwd: dir, stdio: "inherit" });
}

for (const s of services) {
    const target = `services/${s}/.env`;
    if (existsSync(target)) {
        console.log(`kept ${target}`);
        continue;
    }
    let env = readFileSync(`services/${s}/.env.example`, "utf8");
    for (const [k, v] of Object.entries(shared)) env = env.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`);
    if (projectId) env = env.replace(/^FIREBASE_PROJECT_ID=.*$/m, `FIREBASE_PROJECT_ID=${projectId}`);
    writeFileSync(target, env, { mode: 0o600 });
    console.log(`wrote ${target}`);
}
if (!existsSync("frontend/.env.local")) console.log("\nfrontend/.env.local is missing: copy frontend/.env.example and add your Firebase web config.");
