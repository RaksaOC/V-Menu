import { HttpError } from "./errors.js";

/** SEC-04: opening a table by its name is for local testing only. Off unless exactly "true". */
export const tableNameLinksAllowed = () => process.env.ALLOW_TABLE_NAME_LINKS === "true";

/** The same answer for every link that can't be used, so it says nothing about which tables exist. */
export const invalidTableLink = () => new HttpError(404, "This table link isn't valid.", "TABLE_LINK_INVALID");
