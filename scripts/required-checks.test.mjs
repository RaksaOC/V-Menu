// B8: the checks the staging ruleset requires really exist, run on every PR, and can really fail.
// The ruleset is a GitHub setting that people change. This keeps the workflow side right, and
// the list in infra/deploy/README.md ("Required checks") is what they copy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");

const REQUIRED = [
    "test",
    "integration",
    "e2e",
    "audit (frontend)",
    "audit (services/restaurant-service)",
    "audit (services/menu-service)",
    "audit (services/order-service)",
    "semgrep",
];

/** A workflow's jobs: id, text, and the check names GitHub shows for it. */
function jobsOf(file) {
    const text = read(`.github/workflows/${file}`);
    const body = text.slice(text.indexOf("\njobs:\n") + 7);
    const parts = body.split(/\n(?= {2}[\w-]+:\n)/).filter((p) => /^ {2}[\w-]+:\n/.test(p));
    return parts.map((job) => {
        const id = /^ {2}([\w-]+):/.exec(job)[1];
        const name = /^ {4}name: (.+)$/m.exec(job)?.[1] ?? id;
        const matrix = [...job.matchAll(/\{ name: ([^,]+),/g)].map((m) => m[1]);
        const names = name.includes("${{ matrix.name }}") ? matrix.map((m) => name.replace("${{ matrix.name }}", m)) : [name];
        return { id, text: job, names };
    });
}
const onEveryPr = (file) => {
    const text = read(`.github/workflows/${file}`);
    const on = text.slice(text.indexOf("\non:"), text.indexOf("\npermissions:"));
    const pr = /\n {2}pull_request:(.*(?:\n {4,}.*)*)/.exec(on);
    return Boolean(pr) && !/paths|branches/.test(pr[1]);
};
const workflows = readdirSync(join(root, ".github/workflows")).filter((f) => f.endsWith(".yml"));
const all = workflows.flatMap((file) => jobsOf(file).map((job) => ({ ...job, file })));
const find = (check) => all.filter((j) => j.names.includes(check));
const ci = Object.fromEntries(jobsOf("ci.yml").map((j) => [j.id, j]));

for (const check of REQUIRED) {
    test(`required check "${check}" is exactly one job, on every PR, and can fail`, () => {
        const jobs = find(check);
        assert.equal(jobs.length, 1, `jobs named "${check}": ${jobs.map((j) => j.file).join(", ")}`);
        assert.ok(onEveryPr(jobs[0].file), `${jobs[0].file} must run on every PR, or the PR would wait for it for ever`);
        if (jobs[0].file === "ci.yml") assert.doesNotMatch(jobs[0].text, /continue-on-error/);
    });
}

test("semgrep's only soft step is the upload; the step that decides still fails the job", () => {
    const [job] = find("semgrep");
    const soft = job.text.split(/\n(?=\s+- (?:name|uses):)/).filter((s) => s.includes("continue-on-error"));
    assert.equal(soft.length, 1);
    assert.match(soft[0], /Upload to code scanning/);
    assert.match(job.text, /--fail-on-high/);
});

test("checks that only run for some paths aren't on the required list", () => {
    for (const { file, names } of all) {
        if (onEveryPr(file)) continue;
        for (const name of names) assert.ok(!REQUIRED.includes(name), `${name} (${file}) doesn't run on every PR`);
    }
});

test("the test gate fails unless every package passed, the frontend's unit tests included", () => {
    assert.deepEqual(ci["test-ok"].names, ["test"]);
    assert.match(ci["test-ok"].text, /needs: test/);
    assert.match(ci["test-ok"].text, /if: always\(\)/, "a skipped gate would count as passed");
    assert.match(ci["test-ok"].text, /needs\.test\.result \}\}" = "success"/);
    assert.match(ci.test.text, /name: frontend, dir: frontend, kind: web/);
    assert.match(ci.test.text, /- name: Unit tests with coverage\n\s+if: matrix\.kind == 'web'\n\s+run: npm test -- --coverage/);
});

test("the e2e job runs every spec, with no filter", () => {
    const run = /run: (npx playwright test.*)$/m.exec(ci.e2e.text)?.[1];
    assert.equal(run, "npx playwright test");
    assert.match(read("e2e/playwright.config.ts"), /testDir: "\.\/tests"/);
    const specs = readdirSync(join(root, "e2e/tests")).filter((f) => f.endsWith(".spec.ts"));
    assert.ok(specs.length >= 15, `found ${specs.length} specs`);
});

test("a forgotten test.only can't make CI run a single test and stay green", () => {
    assert.match(read("e2e/playwright.config.ts"), /forbidOnly: !!process\.env\.CI/);
});

test("the sign-in specs fail in CI instead of skipping when the emulator is missing", () => {
    assert.match(read("e2e/tests/firebase-auth.spec.ts"), /if \(why && process\.env\.CI\) throw new Error\(why\);/);
});

test("the deploy README lists exactly the required check names", () => {
    const readme = read("infra/deploy/README.md");
    const start = readme.indexOf("<!-- required-checks -->");
    const end = readme.indexOf("<!-- /required-checks -->");
    assert.ok(start >= 0 && end > start, "a required-checks block in infra/deploy/README.md");
    const listed = [...readme.slice(start, end).matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
    assert.deepEqual([...listed].sort(), [...REQUIRED].sort());
});
