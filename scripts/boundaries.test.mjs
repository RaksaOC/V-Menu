// CL-03: the import boundaries hold, and dependency-cruiser catches each kind of bad import.
// Run with `npm run test:repo` (CI: the `test (repo)` job). The rules are in .dependency-cruiser.cjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = join(import.meta.dirname, "..");
const bin = join(root, "node_modules", ".bin", "depcruise");
const config = join(root, ".dependency-cruiser.cjs");

function cruise(cwd, targets) {
    const r = spawnSync(bin, ["--config", ".dependency-cruiser.cjs", "--output-type", "err", ...targets], { cwd, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

/** Builds a tiny repo with the given files, runs the real config over it. */
function probe(files) {
    const dir = mkdtempSync(join(tmpdir(), "vm-boundaries-"));
    try {
        cpSync(config, join(dir, ".dependency-cruiser.cjs"));
        // the real tsconfig, so imports resolve the same way as in the repo
        const base = {
            "frontend/tsconfig.json": readFileSync(join(root, "frontend", "tsconfig.json"), "utf8"),
            "frontend/src/index.ts": "export {};\n", // TypeScript refuses a tsconfig with no files
        };
        for (const [path, body] of Object.entries({ ...base, ...files })) {
            mkdirSync(dirname(join(dir, path)), { recursive: true });
            writeFileSync(join(dir, path), body);
        }
        return cruise(
            dir,
            ["backend", "frontend/src"].filter((t) => existsSync(join(dir, t))),
        );
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

const expectBlocked = (files, rule) => {
    const { code, out } = probe(files);
    assert.notEqual(code, 0, `expected ${rule} to fail the check:\n${out}`);
    assert.match(out, new RegExp(rule));
};
const expectAllowed = (files) => {
    const { code, out } = probe(files);
    assert.equal(code, 0, out);
};

test("the tool and the config are in place", () => {
    assert.ok(existsSync(bin), "dependency-cruiser is a root devDependency");
    assert.ok(existsSync(config), ".dependency-cruiser.cjs exists");
});

test("the code as it is today has no boundary violations", () => {
    const r = spawnSync("npm", ["run", "--silent", "deps"], { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
});

test("a service may not import another service", () => {
    expectBlocked(
        {
            "backend/services/menu/src/app.ts": 'import { Order } from "../../order/src/models.js";\nexport const x = Order;\n',
            "backend/services/order/src/models.ts": "export const Order = 1;\n",
        },
        "no-cross-service",
    );
    expectAllowed({
        "backend/services/menu/src/app.ts": 'import { Item } from "./models.js";\nexport const x = Item;\n',
        "backend/services/menu/src/models.ts": "export const Item = 1;\n",
    });
});

test("routes go through repositories, and repositories don't import routes", () => {
    expectBlocked(
        {
            "backend/services/menu/src/routes/items.ts": 'import { Item } from "../models.js";\nexport const x = Item;\n',
            "backend/services/menu/src/models.ts": "export const Item = 1;\n",
        },
        "routes-not-to-data",
    );
    expectBlocked(
        {
            "backend/services/menu/src/routes/items.ts": 'import { Item } from "../models/item.js";\nexport const x = Item;\n',
            "backend/services/menu/src/models/item.ts": "export const Item = 1;\n",
        },
        "routes-not-to-data",
    );
    expectBlocked(
        {
            "backend/services/menu/src/repositories/items.ts": 'import { r } from "../routes/items.js";\nexport const x = r;\n',
            "backend/services/menu/src/routes/items.ts": "export const r = 1;\n",
        },
        "repositories-not-to-routes",
    );
});

test("shared packages don't import services", () => {
    expectBlocked(
        {
            "backend/packages/common/src/index.ts":
                'import { Item } from "../../../services/menu/src/models.js";\nexport const x = Item;\n',
            "backend/services/menu/src/models.ts": "export const Item = 1;\n",
        },
        "packages-not-to-services",
    );
});

test("the frontend may only import @vmenu/contracts from the backend", () => {
    expectBlocked(
        {
            "frontend/src/lib/api.ts": 'import { Item } from "../../../backend/services/menu/src/models";\nexport const x = Item;\n',
            "backend/services/menu/src/models.ts": "export const Item = 1;\n",
        },
        "frontend-only-contracts",
    );
    expectAllowed({
        "frontend/src/lib/api.ts":
            'import { ItemSchema } from "../../../backend/packages/contracts/src/index";\nexport const x = ItemSchema;\n',
        "backend/packages/contracts/src/index.ts": "export const ItemSchema = 1;\n",
    });
});

test("one feature doesn't import another; shared code lives in components or lib", () => {
    expectBlocked(
        {
            "frontend/src/features/kitchen/Board.tsx": 'import { Cart } from "@/features/customer/Cart";\nexport const x = Cart;\n',
            "frontend/src/features/customer/Cart.tsx": "export const Cart = 1;\n",
        },
        "features-isolated",
    );
    expectBlocked(
        {
            "frontend/src/features/restaurant/Tables.tsx": 'import { Ctx } from "@/features/owner/Ctx";\nexport const x = Ctx;\n',
            "frontend/src/features/owner/Ctx.tsx": "export const Ctx = 1;\n",
        },
        "features-isolated",
    );
    expectAllowed({
        "frontend/src/features/kitchen/Board.tsx":
            'import { Button } from "@/components/ui/Button";\nimport { api } from "@/lib/api";\nexport const x = [Button, api];\n',
        "frontend/src/components/ui/Button.tsx": "export const Button = 1;\n",
        "frontend/src/lib/api.ts": "export const api = 1;\n",
    });
});

test("the owner and cashier dashboards compose only the shared restaurant and staff parts", () => {
    expectAllowed({
        "frontend/src/features/owner/Dashboard.tsx":
            'import { Tables } from "@/features/restaurant/Tables";\nimport { Staff } from "@/features/staff/Staff";\nexport const x = [Tables, Staff];\n',
        "frontend/src/features/restaurant/Tables.tsx": "export const Tables = 1;\n",
        "frontend/src/features/staff/Staff.tsx": "export const Staff = 1;\n",
    });
    expectBlocked(
        {
            "frontend/src/features/cashier/Dashboard.tsx": 'import { Board } from "@/features/kitchen/Board";\nexport const x = Board;\n',
            "frontend/src/features/kitchen/Board.tsx": "export const Board = 1;\n",
        },
        "dashboards-compose-shared-only",
    );
});

test("components and lib don't import features", () => {
    expectBlocked(
        {
            "frontend/src/components/layout/Header.tsx": 'import { signOut } from "@/features/auth/session";\nexport const x = signOut;\n',
            "frontend/src/features/auth/session.ts": "export const signOut = 1;\n",
        },
        "shared-not-to-features",
    );
});
