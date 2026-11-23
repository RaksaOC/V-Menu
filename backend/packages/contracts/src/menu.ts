import { z } from "zod";
import { IsoDate, ObjectId, text } from "./common.js";

// menu-service: dishes and tables (CL-05).

// VM-17: a number from 0, or numeric text (a form field). Anything else is refused, never quietly
// turned into a number: "", null and true used to become 0 or 1.
const Price = z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z
        .number({
            error: ({ input }) => (input === undefined || (typeof input === "string" && !input.trim()) ? "Required" : "Must be a number"),
        })
        .min(0, "Must be 0 or more")
        .refine((v) => Number(v.toFixed(2)) === v, "At most 2 decimal places"),
);

export const CreateItemBody = z.object({
    name: text(120),
    price: Price,
    image: text(2000),
    isEnabled: z.boolean("Must be true or false").optional(),
    /** VM-25: one of this restaurant's categories, or null for "Other". */
    categoryId: ObjectId.nullable().optional(),
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
    categoryId: z.string().nullable().optional(),
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

// VM-25: menu categories. Dishes with no category are shown last, under "Other".
export const OTHER_CATEGORY = "Other";

export const Category = z.object({ _id: z.string(), name: z.string(), sortOrder: z.number(), resId: z.string().optional() });
export type Category = z.infer<typeof Category>;

/** Creating or renaming a category. */
export const CategoryBody = z.object({ name: text(40) });
export type CategoryBody = z.infer<typeof CategoryBody>;

/** A new order: every one of the restaurant's category ids, once. */
export const ReorderCategoriesBody = z.object({ ids: z.array(ObjectId).max(100, "At most 100 categories") });
export type ReorderCategoriesBody = z.infer<typeof ReorderCategoriesBody>;

/** One section of the customer's menu; "Other" has no id. */
export const MenuSection = z.object({ _id: z.string().nullable(), name: z.string(), items: z.array(MenuItem) });
export type MenuSection = z.infer<typeof MenuSection>;

/** GET /api/menu/:slug/public/items: the dishes that are on, by category, in the owner's order. */
export const PublicMenu = z.object({ categories: z.array(MenuSection) });
export type PublicMenu = z.infer<typeof PublicMenu>;
