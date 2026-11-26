import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw";

// Every test talks to MSW instead of a real API. An unmocked request fails the test, so a
// page can't silently call an endpoint the test didn't expect.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
    cleanup();
    server.resetHandlers();
    localStorage.clear();
});
afterAll(() => server.close());
