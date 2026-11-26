// SEC-08: checks a Firebase project's sign-in settings against the checklist in
// infra/deploy/README.md. Read only: it reads the project's Identity Toolkit config and changes nothing.
//
//   FIREBASE_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
//     node infra/checks/check-firebase-config.mjs v-menu-e9835 production v-menu.chanraksa.com
//   ... node infra/checks/check-firebase-config.mjs v-menu-staging staging staging-v-menu.chanraksa.com
//
// The token needs only read access to the project (for example the "Firebase Viewer" role).
// Exits non-zero and lists what's wrong when a setting doesn't match.
import { pathToFileURL } from "node:url";

/** Domains Firebase adds to every project by itself. */
const builtIn = (domain) => domain.endsWith(".firebaseapp.com") || domain.endsWith(".web.app");

/**
 * What doesn't match the checklist, as sentences; empty when everything does.
 * @param config the answer of GET identitytoolkit.googleapis.com/admin/v2/projects/<id>/config
 * @param expected { production: boolean, domains: string[] } the app's own hostnames
 */
export function checkConfig(config, { production, domains }) {
    const problems = [];
    const authorized = config.authorizedDomains ?? [];
    if (production && authorized.includes("localhost")) problems.push("authorized domains include localhost (production must not)");
    for (const d of domains) if (!authorized.includes(d)) problems.push(`authorized domains are missing ${d}`);
    for (const d of authorized)
        if (!domains.includes(d) && !builtIn(d) && d !== "localhost") problems.push(`unexpected authorized domain: ${d}`);

    if (config.emailPrivacyConfig?.enableImprovedEmailPrivacy !== true) problems.push("email enumeration protection is off");

    const policy = config.passwordPolicyConfig;
    const rules = policy?.passwordPolicyVersions?.[0]?.customStrengthOptions;
    if (policy?.passwordPolicyEnforcementState !== "ENFORCE" || !rules) problems.push("no password policy is enforced");
    else {
        if (!(rules.minPasswordLength >= 8))
            problems.push(`password policy allows fewer than 8 characters (${rules.minPasswordLength ?? "no minimum"})`);
        if (rules.containsNumericCharacter !== true) problems.push("password policy doesn't require a number");
    }
    return problems;
}

async function main([project, env, ...domains]) {
    const token = process.env.FIREBASE_ACCESS_TOKEN;
    if (!project || !["production", "staging"].includes(env) || domains.length === 0 || !token) {
        console.error("usage: FIREBASE_ACCESS_TOKEN=... node infra/checks/check-firebase-config.mjs <project> <production|staging> <domain>...");
        process.exit(2);
    }
    const res = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${encodeURIComponent(project)}/config`, {
        headers: { authorization: `Bearer ${token}`, "x-goog-user-project": project },
    });
    if (!res.ok) {
        console.error(`Couldn't read the config of ${project}: HTTP ${res.status}`);
        process.exit(2);
    }
    const problems = checkConfig(await res.json(), { production: env === "production", domains });
    for (const p of problems) console.log(`✗ ${p}`);
    if (problems.length) process.exit(1);
    console.log(`✓ ${project}: authorized domains, email enumeration protection and password policy match the checklist`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main(process.argv.slice(2));
