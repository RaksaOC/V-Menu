import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// B3: coverage runs everywhere, with a minimum that starts at today's numbers and only goes up.
// Targets: 80% of lines in the services, 60% in the frontend.
const read = (f) => readFileSync(f, "utf8");

// Today's numbers, rounded down (2026-11-23). Raise them as tickets add tests; never lower them.
const MINIMUM_LINES = {
    "backend/packages/common/vitest.config.ts": 94,
    "backend/packages/contracts/vitest.config.ts": 95,
    "backend/services/restaurant/vitest.config.ts": 87,
    "backend/services/menu/vitest.config.ts": 98,
    "backend/services/order/vitest.config.ts": 96,
    "frontend/vitest.config.mts": 34,
};

for (const [file, minimum] of Object.entries(MINIMUM_LINES)) {
    test(`${file}: v8 coverage with a lines minimum of at least ${minimum}%`, () => {
        const config = read(file);
        assert.match(config, /provider:\s*"v8"/);
        assert.match(config, /"json-summary"/, "the CI summary reads coverage-summary.json");
        const lines = Number(/thresholds:\s*{\s*lines:\s*(\d+)/.exec(config)?.[1]);
        assert.ok(lines >= minimum, `lines threshold is ${lines}, below today's ${minimum}`);
    });
}

test("ci.yml: the frontend runs its tests with coverage, and every package gets a summary and an artifact", () => {
    const ci = read(".github/workflows/ci.yml");
    assert.match(ci, /if: matrix\.kind == 'web'\s*\n\s*run: npm test -- --coverage/);
    const summary = ci.slice(ci.indexOf("name: Coverage summary"));
    assert.match(summary, /if: always\(\) && \(matrix\.kind == 'service' \|\| matrix\.kind == 'web'\)/);
    assert.match(summary, /node .*scripts\/coverage-summary\.mjs/);
    const upload = ci.slice(ci.indexOf("name: Upload coverage report"));
    assert.match(upload, /if: always\(\) && \(matrix\.kind == 'service' \|\| matrix\.kind == 'web'\)/);
});
