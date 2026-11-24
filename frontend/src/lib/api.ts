import axios from "axios";
import { endSession } from "@/lib/session";

// The one HTTP client of the app. Components never use it directly: each feature wraps the
// calls it needs in typed functions in features/<area>/api.ts. Only this file imports axios.
export const api = axios.create({
    baseURL: "/", // same origin; Next.js forwards /api/* to the services
    // SEC-01: the sign-in is the httpOnly "token" cookie, which the browser sends by itself and
    // page scripts can't read. No token is stored or sent by this code.
    withCredentials: true,
});

// Before SEC-01 the token was also kept in localStorage; drop any copy left from then.
if (typeof window !== "undefined") {
    try {
        localStorage.removeItem("token");
    } catch {
        // storage blocked: nothing to remove
    }
}

/** The HTTP status of a failed call, or undefined when the server could not be reached. */
// VM-03: when the sign-in has ended, staff are sent to their login page instead of a screen
// that silently stops updating. Sign-in calls themselves (a wrong password) are left alone.
api.interceptors.response.use(
    (response) => response,
    (err) => {
        if (axios.isAxiosError(err) && err.response?.status === 401 && !String(err.config?.url ?? "").startsWith("/api/auth/"))
            endSession();
        return Promise.reject(err);
    },
);

export function apiStatus(err: unknown): number | undefined {
    return axios.isAxiosError(err) ? err.response?.status : undefined;
}

/** Text to show for a failed call: the server's own message, or the fallback. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
    if (err instanceof StorageUploadError) return err.message;
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

/** VM-17: what a 400 says is wrong, per field ({ price: "Must be 0 or more" }), if it says. */
export function apiErrorFields(err: unknown): Record<string, string> | undefined {
    if (!axios.isAxiosError(err) || err.response?.status !== 400) return undefined;
    const fields = (err.response.data as { fields?: unknown } | undefined)?.fields;
    if (!fields || typeof fields !== "object") return undefined;
    // A list's item is named "tags.0": it belongs to the "tags" field.
    const byField: Record<string, string> = {};
    for (const [path, message] of Object.entries(fields as Record<string, string>)) byField[path.split(".")[0]] ??= message;
    return byField;
}

// PHOTOS-S3: photos go from the browser straight to object storage (MinIO), with a form that
// menu-service signed. Storage answers errors as S3 XML, not as our JSON.

/** A refused or failed post to object storage, with a message to show. */
export class StorageUploadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StorageUploadError";
    }
}

/** What an S3 error answer means for the person uploading. */
function storageProblem(status: number | undefined, xml: string): string {
    const code = /<Code>([^<]*)<\/Code>/.exec(xml)?.[1] ?? "";
    const message = /<Message>([^<]*)<\/Message>/.exec(xml)?.[1] ?? "";
    if (status === undefined) return "Can't reach the photo storage. Check your connection and try again.";
    if (code === "EntityTooLarge" || /content-length-range|too large/i.test(message)) return "Photos can be at most 5 MB";
    if (/expired/i.test(message) || code === "ExpiredToken") return "The upload link expired. Please try again.";
    if (/Content-Type/i.test(message)) return "Please choose a JPG, PNG or WebP photo";
    return "Could not upload the photo. Please try again.";
}

/**
 * Posts one file to object storage with a signed form: every field first, the file last (S3
 * ignores fields after it). No cookies or app headers go to storage.
 */
export async function postToStorage(
    form: { url: string; fields: Record<string, string> },
    file: File,
    onProgress?: (percent: number) => void,
): Promise<void> {
    const body = new FormData();
    for (const [name, value] of Object.entries(form.fields)) body.append(name, value);
    body.append("file", file);
    try {
        await axios.post(form.url, body, {
            withCredentials: false,
            responseType: "text",
            onUploadProgress: (e) => {
                if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
            },
        });
    } catch (err) {
        if (!axios.isAxiosError(err)) throw err;
        throw new StorageUploadError(storageProblem(err.response?.status, String(err.response?.data ?? "")));
    }
}
