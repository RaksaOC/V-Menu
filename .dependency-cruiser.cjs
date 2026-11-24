// CL-03: the import boundaries between services, layers and features. `npm run deps` checks
// them (CI: the test (repo) job, and `npm run check`). Paths are from the repo root.
const FE = "^frontend/src";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
    forbidden: [
        // ------------------------------------------------------------------ backend
        {
            name: "no-cross-service",
            comment: "A service never imports another service's code. Call its API, or share code through backend/packages.",
            severity: "error",
            from: { path: "^backend/services/([^/]+)/" },
            to: { path: "^backend/services/", pathNot: "^backend/services/$1/" },
        },
        {
            name: "routes-not-to-data",
            comment: "Routes call the service layer; only it talks to repositories and models (CL-04).",
            severity: "error",
            from: { path: "^backend/services/[^/]+/src/routes/" },
            to: { path: "^backend/services/[^/]+/src/(models|repositories)(/|\\.[cm]?[jt]s$)" },
        },
        {
            name: "repositories-not-to-routes",
            comment: "Repositories are the data layer; they don't know about HTTP routes (CL-04).",
            severity: "error",
            from: { path: "^backend/services/[^/]+/src/repositories/" },
            to: { path: "^backend/services/[^/]+/src/routes/" },
        },
        {
            name: "packages-not-to-services",
            comment: "Shared packages are used by services, never the other way round.",
            severity: "error",
            from: { path: "^backend/packages/" },
            to: { path: "^backend/services/" },
        },
        // ------------------------------------------------------------------ frontend
        {
            name: "frontend-only-contracts",
            comment: "The frontend talks to the backend over HTTP. Of the backend's code it may only import @vmenu/contracts.",
            severity: "error",
            from: { path: "^frontend/" },
            to: {
                path: "^(backend/|@vmenu/|node_modules/@vmenu/)",
                pathNot: "^(backend/packages/contracts/|@vmenu/contracts|node_modules/@vmenu/contracts)",
            },
        },
        {
            name: "features-isolated",
            comment: "One feature doesn't import another. Shared code goes in components/ or lib/.",
            severity: "error",
            from: { path: `${FE}/features/([^/]+)/`, pathNot: `${FE}/features/(owner|cashier)/` },
            to: { path: `${FE}/features/`, pathNot: `${FE}/features/$1/` },
        },
        {
            name: "dashboards-compose-shared-only",
            comment:
                "The owner and cashier dashboards may compose the shared screen parts (features/restaurant, CL-09, and features/staff), and nothing else from other features.",
            severity: "error",
            from: { path: `${FE}/features/(owner|cashier)/` },
            to: { path: `${FE}/features/`, pathNot: `${FE}/features/($1|restaurant|staff)/` },
        },
        {
            name: "shared-not-to-features",
            comment: "components/, lib/ and theme/ are used by features, so they can't depend on one.",
            severity: "error",
            from: { path: `${FE}/(components|lib|theme)/` },
            to: { path: `${FE}/features/` },
        },
    ],
    options: {
        doNotFollow: { path: "node_modules" },
        exclude: { path: "(^|/)(node_modules|dist|\\.next|coverage|test-results)/" },
        tsPreCompilationDeps: true,
        tsConfig: { fileName: "frontend/tsconfig.json" },
    },
};
