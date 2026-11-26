// B4: one e2e spec per journey, a phone-sized project for the customer specs, and traces kept
// when a spec fails. Run with `npm run test:repo` (CI: the `test (repo)` job).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const spec = (name) => `e2e/tests/${name}.spec.ts`;

/** Each journey's spec, and what it must do (a pattern per step). */
const JOURNEYS = {
    "owner-setup": {
        "signs up through the Auth emulator": /firebase\.testEmail\(/,
        "never reaches a real Google service": /googleapis\\?\.com/,
        "adds a category": /New category/,
        "adds a dish with a photo": /setInputFiles\(/,
        "adds a table": /Add Table/,
        "opens the QR code": /View QR Code/,
    },
    qr: {
        "decodes the QR code": /jsQR\(/,
        "opens that table's menu": /Our Menu/,
    },
    "customer-order": {
        "adds a note in the cart": /note/i,
        "places the order": /Place Order/,
        "shows the status on the confirmation page": /status/i,
    },
    kitchen: {
        "the order appears": /\/kitchen/,
        "moves through the statuses": /Preparing[\s\S]*Ready[\s\S]*Served/i,
        "appears in history": /History/,
    },
    cashier: {
        "opens a table": /availability|Open table|isEnabled/i,
        "the bill updates without a reload": /NEW/,
        "marks it paid": /paid/i,
        "prints the invoice": /print/i,
    },
    errors: {
        "closed table": /closed/i,
        "unknown restaurant": /unknown restaurant|not found/i,
        "sold-out dish": /sold out/i,
        503: /503/,
        429: /429/,
    },
    session: {
        "an expired session redirects with a message": /expired=1/,
    },
};

for (const [name, steps] of Object.entries(JOURNEYS)) {
    test(`journey spec ${name}.spec.ts covers its steps`, () => {
        assert.ok(existsSync(join(root, spec(name))), `${spec(name)} exists`);
        const src = read(spec(name));
        const missing = Object.entries(steps)
            .filter(([, re]) => !re.test(src))
            .map(([step]) => step);
        assert.deepEqual(missing, []);
    });
}

test("a phone-sized project (360 x 780) runs the customer specs", () => {
    const config = read("e2e/playwright.config.ts");
    assert.match(config, /name:\s*"mobile"/);
    assert.match(config, /viewport:\s*\{\s*width:\s*360,\s*height:\s*780\s*\}/);
    for (const name of ["customer-order", "qr", "errors"]) assert.match(config, new RegExp(name), `mobile runs ${name}`);
});

test("traces and screenshots are kept when a spec fails, and CI uploads them", () => {
    const config = read("e2e/playwright.config.ts");
    assert.match(config, /trace:\s*"retain-on-failure"/);
    assert.match(config, /screenshot:\s*"only-on-failure"/);
    assert.match(read(".github/workflows/ci.yml"), /e2e\/test-results\//);
});
