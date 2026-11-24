import { z } from "zod";
import { Cents, IsoDate, ObjectId, text } from "./common.js";
import { toCents } from "./money.js";

// menu-service: dishes and tables (CL-05).

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

const MAX_PRICE_CENTS = 100_000_000; // the same as Cents

// VM-17: a price in dollars, as the owner types it: a number from 0, or numeric text (a form
// field). Anything else is refused, never quietly turned into a number: "", null and true used to
// become 0 or 1.
const DollarPrice = z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : v),
    z
        .number({
            error: ({ input }) => (input === undefined || (typeof input === "string" && !input.trim()) ? "Required" : "Must be a number"),
        })
        .min(0, "Must be 0 or more")
        .refine((v) => Number(v.toFixed(2)) === v, "At most 2 decimal places")
        .refine((v) => toCents(v) <= MAX_PRICE_CENTS, "At most $1,000,000"),
);

/** The old `price` in dollars, turned into `priceCents` once it passes VM-17's checks. */
const dollarsToCents = <T extends { price?: number }>({ price, ...rest }: T) =>
    price === undefined ? rest : { ...rest, priceCents: toCents(price) };

/**
 * CL-07: the field is `priceCents`. For one release a body with only the old `price` in dollars
 * (a page opened before the deploy) is still accepted: it gets VM-17's checks and messages, under
 * `price`, so that page shows them next to its Price field. When both are sent, the cents win.
 */
function withOldPrice<Out>(current: z.ZodType<Out>, old: z.ZodType<Out>) {
    return z.unknown().transform((body, ctx): Out => {
        const onlyOld = !!body && typeof body === "object" && !("priceCents" in body) && "price" in body;
        const result = (onlyOld ? old : current).safeParse(body);
        if (result.success) return result.data;
        for (const issue of result.error.issues)
            ctx.addIssue({ code: "custom", message: issue.message, path: issue.path, input: issue.input });
        return z.NEVER;
    });
}

const OldItemFields = ItemFields.omit({ priceCents: true }).extend({ price: DollarPrice });

export const CreateItemBody = withOldPrice<z.output<typeof ItemFields>>(
    ItemFields,
    OldItemFields.transform((b) => dollarsToCents(b) as z.output<typeof ItemFields>),
);
export type CreateItemBody = z.infer<typeof CreateItemBody>;

export const UpdateItemBody = withOldPrice<z.output<ReturnType<typeof ItemFields.partial>>>(
    ItemFields.partial(),
    OldItemFields.partial().transform(dollarsToCents),
);
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

// PHOTOS-S3: a menu photo goes from the browser straight to object storage. The owner asks for a
// signed form (PhotoUploadBody -> PhotoUploadForm), posts the file to `url` with `fields`, then
// sends the key back (ConfirmPhotoBody), which answers { url } to save on the dish.
/** The type is checked by the service (415 for anything but JPEG, PNG or WebP). */
export const PhotoUploadBody = z.object({ contentType: z.string("Required").max(100, "At most 100 characters") });
export type PhotoUploadBody = z.infer<typeof PhotoUploadBody>;

export const PhotoUploadForm = z.object({
    key: z.string(),
    url: z.string(),
    fields: z.record(z.string(), z.string()),
    expiresAt: IsoDate,
    maxBytes: z.number(),
});
export type PhotoUploadForm = z.infer<typeof PhotoUploadForm>;

export const ConfirmPhotoBody = z.object({ key: z.string("Required").max(200, "At most 200 characters") });
export type ConfirmPhotoBody = z.infer<typeof ConfirmPhotoBody>;
