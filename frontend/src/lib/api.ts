import axios from "axios";
import { endSession } from "@/lib/session";

// The one HTTP client of the app. Components never use it directly: each feature wraps the
// calls it needs in typed functions in features/<area>/api.ts. Only this file imports axios.
const api = axios.create({
    baseURL: "/", // same origin; Next.js forwards /api/* to the services
});

// Sends the app token of the signed-in staff member, if any.
api.interceptors.request.use(async (config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/** The HTTP status of a failed call, or undefined when the server could not be reached. */
// VM-03: when the sign-in has ended, staff are sent to their login page instead of a screen
// that silently stops updating. Sign-in calls themselves (a wrong password) are left alone.
api.interceptors.response.use(
    (response) => response,
    (err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401 && !String(err.config?.url ?? "").startsWith("/api/auth/")) endSession();
        return Promise.reject(err);
    },
);

export function apiStatus(err: unknown): number | undefined {
    return axios.isAxiosError(err) ? err.response?.status : undefined;
}

/** Text to show for a failed call: the server's own message, or the fallback. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
    if (axios.isAxiosError(err)) {
        if (!err.response) return "Can't reach the server. Check your connection and try again.";
        const message = (err.response.data as { message?: unknown } | undefined)?.message;
        if (typeof message === "string" && message.trim()) return message;
    }
    return fallback;
}

/** Encodes one path segment (a slug, an id or a table name). */
export const seg = (value: string) => encodeURIComponent(value);

export default api;

/** The machine-readable `code` an API error carries (e.g. "TABLE_CLOSED"), if any. */
export function apiErrorCode(err: unknown): string | undefined {
    if (!axios.isAxiosError(err)) return undefined;
    const code = (err.response?.data as { code?: unknown } | undefined)?.code;
    return typeof code === "string" ? code : undefined;
}
