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

export const Restaurant = z.object({
    _id: z.string(),
    name: z.string(),
    slug: z.string(),
    ownerId: z.string(),
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
});
export type StaffMember = z.infer<typeof StaffMember>;

export const StaffOverview = z.array(z.object({ resName: z.string(), staff: z.array(StaffMember) }));
export type StaffOverview = z.infer<typeof StaffOverview>;

/** { "Name - slug": ["owner", "cashier"] } */
export const Memberships = z.record(z.string(), z.array(Role));
export type Memberships = z.infer<typeof Memberships>;

export const LoginResponse = z.object({ role: Role });
export const SignupResponse = z.object({ message: z.string(), slug: z.string() });
