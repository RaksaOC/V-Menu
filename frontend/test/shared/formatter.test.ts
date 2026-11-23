import { describe, expect, it } from "vitest";
import { prettyDate } from "@/lib/dates";

describe("prettyDate", () => {
    const iso = "2026-11-23T09:30:00.000Z";

    it("shows date and time by default, in the browser's locale", () => {
        expect(prettyDate(iso)).toBe(new Date(iso).toLocaleString());
    });

    it("shows only the date when asked", () => {
        expect(prettyDate(iso, false)).toBe(new Date(iso).toLocaleDateString());
    });
});
