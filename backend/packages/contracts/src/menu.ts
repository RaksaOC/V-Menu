import { z } from "zod";
import { IsoDate, text } from "./common.js";

// menu-service: dishes and tables (CL-05).

const Price = z.coerce.number("Must be a number").refine(Number.isFinite, "Must be a number").pipe(z.number().min(0, "Can't be negative"));

export const CreateItemBody = z.object({
    name: text(120),
    price: Price,
    image: text(2000),
    isEnabled: z.boolean("Must be true or false").optional(),
});
export type CreateItemBody = z.infer<typeof CreateItemBody>;

export const UpdateItemBody = CreateItemBody.partial();
export type UpdateItemBody = z.infer<typeof UpdateItemBody>;

/** Switching a dish or a table on or off. */
export const AvailabilityBody = z.object({ isEnabled: z.boolean("Must be true or false") });
export type AvailabilityBody = z.infer<typeof AvailabilityBody>;

/** "manual" takes the given name; anything else gets the next free number. */
export const CreateTableBody = z
    .object({ type: z.string().optional(), name: z.string("Must be text").optional() })
    .superRefine((b, ctx) => {
        if (b.type !== "manual") return;
        const name = b.name?.trim() ?? "";
        if (!name) ctx.addIssue({ code: "custom", path: ["name"], message: "Required" });
        else if (name.length > 40) ctx.addIssue({ code: "custom", path: ["name"], message: "At most 40 characters" });
    });
export type CreateTableBody = z.infer<typeof CreateTableBody>;

export const UpdateTableBody = z.object({ name: text(40).optional(), isEnabled: z.boolean("Must be true or false").optional() });
export type UpdateTableBody = z.infer<typeof UpdateTableBody>;

export const MenuItem = z.object({
    _id: z.string(),
    name: z.string(),
    price: z.number(),
    image: z.string(),
    isEnabled: z.boolean(),
    resId: z.string().optional(),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
export type MenuItem = z.infer<typeof MenuItem>;

export const Table = z.object({
    _id: z.string(),
    name: z.string(),
    isEnabled: z.boolean(),
    resId: z.string().optional(),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
export type Table = z.infer<typeof Table>;

/** The answer to a photo upload: the URL to save on the item. */
export const UploadedPhoto = z.object({ url: z.string() });
export type UploadedPhoto = z.infer<typeof UploadedPhoto>;
