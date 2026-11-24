import { http, HttpResponse, type JsonBodyType } from "msw";
import { vi } from "vitest";
import { server } from "../msw";

// The API client imports the Firebase config only for `auth`; tests need no Firebase app.
vi.mock("@/lib/firebase", () => ({ auth: {} }));

export interface Seen {
    method: string;
    path: string;
    body: unknown;
}

type Method = "get" | "post" | "put" | "patch" | "delete";

// Answers one call and records what the client sent, so a test can check the URL and body.
export function answer(method: Method, path: string, reply: JsonBodyType = {}, status = 200): Seen[] {
    const seen: Seen[] = [];
    server.use(
        http[method](`*${path}`, async ({ request }) => {
            const text = await request.text();
            seen.push({ method: request.method, path: new URL(request.url).pathname, body: text ? JSON.parse(text) : undefined });
            return HttpResponse.json(reply, { status });
        }),
    );
    return seen;
}
