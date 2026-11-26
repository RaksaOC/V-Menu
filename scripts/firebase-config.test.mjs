import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkConfig } from "../infra/checks/check-firebase-config.mjs";

// SEC-08: the read-only check of a Firebase project's sign-in settings. These tests feed it sample
// answers; it is never run against a real project here.
const good = {
    authorizedDomains: ["v-menu-e9835.firebaseapp.com", "v-menu-e9835.web.app", "v-menu.chanraksa.com"],
    emailPrivacyConfig: { enableImprovedEmailPrivacy: true },
    passwordPolicyConfig: {
        passwordPolicyEnforcementState: "ENFORCE",
        passwordPolicyVersions: [{ customStrengthOptions: { minPasswordLength: 8, containsNumericCharacter: true } }],
    },
};
const prod = { production: true, domains: ["v-menu.chanraksa.com"] };

test("a project set up as the checklist says passes", () => {
    assert.deepEqual(checkConfig(good, prod), []);
});

test("production must not allow localhost", () => {
    const problems = checkConfig({ ...good, authorizedDomains: [...good.authorizedDomains, "localhost"] }, prod);
    assert.deepEqual(problems, ["authorized domains include localhost (production must not)"]);
});

test("staging may allow localhost", () => {
    const staging = { production: false, domains: ["staging-v-menu.chanraksa.com"] };
    const config = { ...good, authorizedDomains: ["localhost", "staging-v-menu.chanraksa.com"] };
    assert.deepEqual(checkConfig(config, staging), []);
});

test("the app's own domain must be there", () => {
    const problems = checkConfig({ ...good, authorizedDomains: ["v-menu-e9835.web.app"] }, prod);
    assert.deepEqual(problems, ["authorized domains are missing v-menu.chanraksa.com"]);
});

test("domains nobody expects are listed", () => {
    const problems = checkConfig({ ...good, authorizedDomains: [...good.authorizedDomains, "example.org"] }, prod);
    assert.deepEqual(problems, ["unexpected authorized domain: example.org"]);
});

test("email enumeration protection must be on", () => {
    const problems = checkConfig({ ...good, emailPrivacyConfig: {} }, prod);
    assert.deepEqual(problems, ["email enumeration protection is off"]);
});

test("the password policy must be enforced, with at least 8 characters and a number", () => {
    assert.deepEqual(checkConfig({ ...good, passwordPolicyConfig: undefined }, prod), ["no password policy is enforced"]);
    const weak = {
        ...good,
        passwordPolicyConfig: {
            passwordPolicyEnforcementState: "ENFORCE",
            passwordPolicyVersions: [{ customStrengthOptions: { minPasswordLength: 6 } }],
        },
    };
    assert.deepEqual(checkConfig(weak, prod), [
        "password policy allows fewer than 8 characters (6)",
        "password policy doesn't require a number",
    ]);
});

test("the checklist is in infra/deploy/README.md", () => {
    const readme = readFileSync("infra/deploy/README.md", "utf8");
    for (const words of [
        "Firebase hardening checklist (SEC-08)",
        "HTTP referrers",
        "Identity Toolkit API",
        "Token Service API",
        "localhost",
        "Email enumeration protection",
        "password policy",
        "check-firebase-config.mjs",
    ])
        assert.ok(readme.includes(words), `README is missing "${words}"`);
});
