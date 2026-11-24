import { randomBytes } from "node:crypto";

/** SEC-04: a table's link token: 16 random bytes (128 bits) in base64url, 22 characters. */
export const newQrToken = () => randomBytes(16).toString("base64url");
