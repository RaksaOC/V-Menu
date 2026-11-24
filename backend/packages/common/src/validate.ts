import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errors.js";

// CL-05: request bodies are checked against the schemas in @vmenu/contracts. Any schema with a
// zod-style safeParse works, so this package doesn't depend on zod itself.
type Issue = { path: PropertyKey[]; message: string };
export interface Schema<T> {
    safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: Issue[] } };
}

/** 400 INVALID_INPUT naming each field once: { fields: { price: "Must be a number" } } (VM-17). */
function invalid(issues: Issue[]) {
    const fields: Record<string, string> = {};
    for (const issue of issues) {
        const field = issue.path.map(String).join(".") || "body";
        fields[field] ??= issue.message;
    }
    return new HttpError(400, `Please check: ${Object.keys(fields).join(", ")}`, "INVALID_INPUT", fields);
}

/** The parsed value (trimmed, unknown fields dropped), or a 400 that names the fields. */
export function parse<T>(schema: Schema<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) throw invalid(result.error.issues);
    return result.data;
}

/** Route middleware: replaces req.body with the parsed body, or answers 400. */
export function validate<T>(schema: Schema<T>) {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            req.body = parse(schema, req.body ?? {});
            next();
        } catch (err) {
            next(err);
        }
    };
}
