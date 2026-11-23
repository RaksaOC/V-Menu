// B9: checks the issue forms and the PR template keep the fields the team relies on.
// Run with `npm run test:repo` (node:test, no dependencies). CI runs it in the `test` gate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gh = (p) => join(root, ".github", p);

function read(p) {
  assert.ok(existsSync(p), `missing ${p}`);
  return readFileSync(p, "utf8").replace(/\r\n/g, "\n");
}

// Issue forms are YAML. Without a YAML dependency we check the shape line by line:
// every body element is "- type: X" followed by "id:" and "attributes: label:".
function formFields(yaml) {
  assert.ok(!/\t/.test(yaml), "YAML must be indented with spaces, not tabs");
  assert.match(yaml, /^name: .+/m, "form needs a name");
  assert.match(yaml, /^description: .+/m, "form needs a description");
  assert.match(yaml, /^body:\s*$/m, "form needs a body");
  const fields = [];
  for (const block of yaml.split(/^ {2}- type: /m).slice(1)) {
    const type = block.split("\n")[0].trim();
    const id = block.match(/^ {4}id: ([\w-]+)\s*$/m)?.[1];
    const label = block.match(/^ {6}label: (.+)$/m)?.[1];
    const required = /^ {6}required: true\s*$/m.test(block);
    const options = [...block.matchAll(/^ {8}- (.+)$/gm)].map((m) => m[1].trim());
    if (type !== "markdown") {
      assert.ok(id, `a ${type} field has no id`);
      assert.ok(label, `field ${id} has no label`);
    }
    fields.push({ type, id, label, required, options });
  }
  return fields;
}

function formLabels(yaml) {
  const m = yaml.match(/^labels: \[(.*)\]\s*$/m);
  assert.ok(m, "form needs a labels: [...] line");
  return m[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

const byId = (fields, id) => {
  const f = fields.find((x) => x.id === id);
  assert.ok(f, `missing field "${id}"`);
  return f;
};

test("bug form has steps, expected, actual, environment, screenshot and priority", () => {
  const yaml = read(gh("ISSUE_TEMPLATE/bug.yml"));
  const fields = formFields(yaml);
  for (const id of ["steps", "expected", "actual"]) {
    assert.equal(byId(fields, id).type, "textarea");
    assert.ok(byId(fields, id).required, `${id} must be required`);
  }
  const env = byId(fields, "environment");
  assert.equal(env.type, "dropdown");
  assert.deepEqual(env.options.map((o) => o.toLowerCase()), ["staging", "production", "local"]);
  assert.equal(byId(fields, "screenshot").type, "textarea");
  const prio = byId(fields, "priority");
  assert.equal(prio.type, "dropdown");
  assert.deepEqual(prio.options.map((o) => o.slice(0, 2)), ["P0", "P1", "P2"]);
  assert.ok(formLabels(yaml).includes("bug"));
});

test("feature form has problem, proposed change and done when", () => {
  const yaml = read(gh("ISSUE_TEMPLATE/feature.yml"));
  const fields = formFields(yaml);
  for (const id of ["problem", "proposal", "done-when"]) {
    assert.equal(byId(fields, id).type, "textarea");
    assert.ok(byId(fields, id).required, `${id} must be required`);
  }
  assert.ok(formLabels(yaml).includes("feature"));
});

test("PR template checklist covers ticket, failing test, screenshots and staging", () => {
  const md = read(gh("pull_request_template.md"));
  const items = [...md.matchAll(/^- \[ \] (.+)$/gm)].map((m) => m[1].toLowerCase());
  const has = (re, what) => assert.ok(items.some((i) => re.test(i)), `checklist needs: ${what}`);
  has(/ticket id/, "ticket ID");
  has(/fails without the fix/, "a test that fails without the fix");
  has(/screenshot.*light.*dark/, "screenshots for UI changes (light and dark)");
  has(/staging after (the )?merge/, "checked on staging after merge");
});
