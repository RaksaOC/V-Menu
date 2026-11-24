import { z } from "zod";
import { Cents, IsoDate, ObjectId, text } from "./common.js";
import { toCents } from "./money.js";

// menu-service: dishes and tables (CL-05).

/**
 * CL-07: the field is `priceCents`. For one release the old `price` in dollars is still accepted,
 * for a page opened before the deploy. Something that isn't a number is left for the check to refuse.
 *
 * VM-17: the old field is still strict: a number from 0, or numeric text (a form field). "", null and
 * true are refused, never quietly turned into 0 or 1, and so is a price with more than 2 decimal
 * places (it is passed on as a fraction of a cent, which `Cents` refuses).
 */
function oldPriceToCents(body: unknown) {
    if (!body || typeof body !== "object" || "priceCents" in body || !("price" in body)) return body;
    const { price, ...rest } = body as { price: unknown };
    const dollars = typeof price === "number" || (typeof price === "string" && price.trim() !== "") ? Number(price) : NaN;
    if (!Number.isFinite(dollars)) return { ...rest, priceCents: price };
    return { ...rest, priceCents: Number(dollars.toFixed(2)) === dollars ? toCents(dollars) : dollars * 100 };
}

/** VM-26: the labels a dish can carry. The browser has a copy (item-rules.ts); a test compares them. */
export const DISH_TAGS = [
    "vegetarian",
    "vegan",
    "spicy",
    "contains nuts",
    "contains dairy",
    "contains gluten",
    "contains seafood",
] as const;
const DishTag = z.enum(DISH_TAGS, "Not one of the dish tags");

const ItemFields = z.object({
    name: text(120),
    priceCents: Cents,
    image: text(2000),
    isEnabled: z.boolean("Must be true or false").optional(),
    /** VM-25: one of this restaurant's categories, or null for "Other". */
    categoryId: ObjectId.nullable().optional(),
    /** VM-26: optional; "" clears it. */
    description: z.string("Must be text").trim().max(300, "At most 300 characters").optional(),
    /** VM-26: each tag once; [] clears them. */
    tags: z
        .array(DishTag, "Must be a list")
        .max(DISH_TAGS.length, `At most ${DISH_TAGS.length} tags`)
        .transform((tags) => [...new Set(tags)])
        .optional(),
});

export const CreateItemBody = z.preprocess(oldPriceToCents, ItemFields);
export type CreateItemBody = z.infer<typeof CreateItemBody>;

export const UpdateItemBody = z.preprocess(oldPriceToCents, ItemFields.partial());
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
    priceCents: Cents,
    /** @deprecated CL-07: priceCents / 100, for pages opened before the deploy; gone in the next release. */
    price: z.number().optional(),
    image: z.string(),
    isEnabled: z.boolean(),
    categoryId: z.string().nullable().optional(),
    description: z.string().optional(), // VM-26: older dishes have neither
    tags: z.array(z.string()).optional(),
    resId: z.string().optional(),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
export type MenuItem = z.infer<typeof MenuItem>;

export const Table = z.object({
    _id: z.string(),
    name: z.string(),
    isEnabled: z.boolean(),
    /** SEC-04: the secret part of this table's QR code. Staff only. */
    qrToken: z.string(),
    resId: z.string().optional(),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
export type Table = z.infer<typeof Table>;

/** SEC-04: all a customer learns from a table's link token. */
export const TableLink = z.object({ table: z.string(), isOpen: z.boolean() });
export type TableLink = z.infer<typeof TableLink>;

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

/** GET /api/menu/:slug/public/items: every dish, by category, in the owner's order. A dish that is off is shown as sold out (VM-26). */
export const PublicMenu = z.object({ categories: z.array(MenuSection) });
export type PublicMenu = z.infer<typeof PublicMenu>;
