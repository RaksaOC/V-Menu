// CL-07: one date format everywhere, in the restaurant's time zone rather than the device's.

export const DEFAULT_TIME_ZONE = "Asia/Phnom_Penh";

type DateInput = string | Date | null | undefined;
interface ZoneOption {
    /** The restaurant's time zone; Asia/Phnom_Penh when it has none. */
    timeZone?: string;
}

function parse(value: DateInput) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function show(date: Date, locale: string, parts: Intl.DateTimeFormatOptions, timeZone = DEFAULT_TIME_ZONE) {
    let formatter: Intl.DateTimeFormat;
    try {
        formatter = new Intl.DateTimeFormat(locale, { ...parts, timeZone });
    } catch {
        formatter = new Intl.DateTimeFormat(locale, { ...parts, timeZone: DEFAULT_TIME_ZONE }); // an unknown zone
    }
    return formatter.format(date).replace(/ /g, " "); // newer browsers put a narrow space before AM/PM
}

/** "24 Nov 2026", or "Tue, 24 Nov" with `weekday`. Empty for something that isn't a date. */
export function formatDate(value: DateInput, { timeZone, weekday = false }: ZoneOption & { weekday?: boolean } = {}) {
    const date = parse(value);
    if (!date) return "";
    if (weekday)
        return `${show(date, "en-GB", { weekday: "short" }, timeZone)}, ${show(date, "en-GB", { day: "numeric", month: "short" }, timeZone)}`;
    return show(date, "en-GB", { day: "numeric", month: "short", year: "numeric" }, timeZone);
}

/** "3:30 PM", or "3:30:05 PM" with `seconds`. Empty for something that isn't a date. */
export function formatTime(value: DateInput, { timeZone, seconds = false }: ZoneOption & { seconds?: boolean } = {}) {
    const date = parse(value);
    if (!date) return "";
    return show(date, "en-US", { hour: "numeric", minute: "2-digit", ...(seconds && { second: "2-digit" }), hour12: true }, timeZone);
}

/** "24 Nov 2026, 3:30 PM". Empty for something that isn't a date. */
export function formatDateTime(value: DateInput, options: ZoneOption = {}) {
    const date = formatDate(value, options);
    return date && `${date}, ${formatTime(value, options)}`;
}
