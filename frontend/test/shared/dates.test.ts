import { describe, expect, it } from "vitest";
import { DEFAULT_TIME_ZONE, formatDate, formatDateTime, formatTime } from "@/lib/dates";

// CL-07: one date format, in the restaurant's time zone, whatever the device's zone is.
// 17:30 UTC on the 23rd is already 00:30 on the 24th in Phnom Penh (UTC+7).
const ISO = "2026-11-23T17:30:00.000Z";

describe("dates", () => {
    it("default to Phnom Penh", () => {
        expect(DEFAULT_TIME_ZONE).toBe("Asia/Phnom_Penh");
        expect(formatDate(ISO)).toBe("24 Nov 2026");
        expect(formatTime(ISO)).toBe("12:30 AM");
        expect(formatDateTime(ISO)).toBe("24 Nov 2026, 12:30 AM");
    });

    it("use the restaurant's time zone when given", () => {
        expect(formatDate(ISO, { timeZone: "America/New_York" })).toBe("23 Nov 2026");
        expect(formatTime(ISO, { timeZone: "Asia/Tokyo" })).toBe("2:30 AM");
        expect(formatDateTime(ISO, { timeZone: "UTC" })).toBe("23 Nov 2026, 5:30 PM");
    });

    it("take a Date too", () => {
        expect(formatTime(new Date(ISO))).toBe("12:30 AM");
    });

    it("can show seconds, or the weekday, for the dashboard clock", () => {
        expect(formatTime(ISO, { seconds: true })).toBe("12:30:00 AM");
        expect(formatDate(ISO, { weekday: true })).toBe("Tue, 24 Nov");
    });

    it("an unknown time zone falls back to the default", () => {
        expect(formatTime(ISO, { timeZone: "Mars/Olympus" })).toBe("12:30 AM");
    });

    it("show nothing for something that isn't a date, instead of crashing the page", () => {
        expect(formatDate("not a date")).toBe("");
        expect(formatTime("")).toBe("");
        expect(formatDateTime(undefined)).toBe("");
    });
});
