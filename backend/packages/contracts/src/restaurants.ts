import { z } from "zod";
import { Email, IsoDate, Role, StaffRole, text } from "./common.js";

// restaurant-service: sign-in, restaurants and staff (CL-05). The Firebase ID token is checked
// first (401 without one), so these bodies describe the rest of each request.

/** Every sign-in call carries the Firebase ID token; without a valid one the answer is 401. */
export const IdTokenBody = z.object({ idToken: text(4096) });

/** Internal: an owner's restaurants. */
export const OwnerIdQuery = z.object({ ownerId: text(128) });

export const SignupBody = z.object({ ownerName: text(120), resName: text(120) });
export type SignupBody = z.infer<typeof SignupBody>;

/** Staff pick a restaurant; owners don't. */
export const LoginBody = z.object({ role: Role, resSlug: text(120).optional() });
export type LoginBody = z.infer<typeof LoginBody>;

export const CreateRestaurantBody = z.object({ name: text(120) });
export type CreateRestaurantBody = z.infer<typeof CreateRestaurantBody>;

export const AddStaffBody = z.object({ name: text(120), email: Email, tenantId: text(128), role: StaffRole });
export type AddStaffBody = z.infer<typeof AddStaffBody>;

export const UpdateStaffBody = z.object({ name: text(120).optional(), email: Email.optional(), role: StaffRole.optional() });
export type UpdateStaffBody = z.infer<typeof UpdateStaffBody>;

/** VM-24: how the restaurant shows prices: US dollars, riel, or both. */
export const Currency = z.enum(["USD", "KHR", "both"], "Choose USD, KHR or both");
export const KhrPerUsd = z
    .number("Must be a number")
    .int("Must be a whole number")
    .min(1000, "Must be between 1,000 and 10,000")
    .max(10000, "Must be between 1,000 and 10,000");
/** A payment QR is a photo uploaded for the restaurant (VM-02): never a link to another site. */
export const PAYMENT_QR_URL = /^\/api\/menu\/[a-z0-9-]+\/images\/[0-9a-f]{24}$/;

/** VM-24: what any page may know to show prices and print an invoice. */
export const RestaurantSettings = z.object({
    name: z.string(),
    currency: Currency,
    khrPerUsd: KhrPerUsd,
    paymentQrUrl: z.string().nullable(),
});
export type RestaurantSettings = z.infer<typeof RestaurantSettings>;

/** The owner changes some or all of them. null removes the payment QR. */
export const UpdateSettingsBody = z.object({
    currency: Currency.optional(),
    khrPerUsd: KhrPerUsd.optional(),
    paymentQrUrl: z.string().regex(PAYMENT_QR_URL, "Upload the QR code as a photo").nullable().optional(),
});
export type UpdateSettingsBody = z.infer<typeof UpdateSettingsBody>;

export const Restaurant = z.object({
    _id: z.string(),
    name: z.string(),
    slug: z.string(),
    ownerId: z.string(),
    /** VM-24: missing on a restaurant that never set them */
    settings: UpdateSettingsBody.optional(),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
export type Restaurant = z.infer<typeof Restaurant>;

/** One role of one person at one restaurant (called a tenant in the database). */
export const StaffMember = z.object({
    _id: z.string(),
    name: z.string(),
    tenantId: z.string(),
    email: z.string(),
    role: Role,
    resId: z.string(),
    createdAt: IsoDate,
    updatedAt: IsoDate,
});
export type StaffMember = z.infer<typeof StaffMember>;

export const StaffOverview = z.array(z.object({ resName: z.string(), staff: z.array(StaffMember) }));
export type StaffOverview = z.infer<typeof StaffOverview>;

/** { "Name - slug": ["owner", "cashier"] } */
export const Memberships = z.record(z.string(), z.array(Role));
export type Memberships = z.infer<typeof Memberships>;

export const LoginResponse = z.object({ role: Role });
export const SignupResponse = z.object({ message: z.string(), slug: z.string() });
