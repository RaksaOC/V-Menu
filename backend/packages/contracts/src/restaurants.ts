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

/** VM-12: an invite. The person's account is linked when they first sign in with that email,
 *  verified; an account id sent here is ignored, so an owner can't attach a role to someone's account. */
export const AddStaffBody = z.object({ name: text(120), email: Email, role: StaffRole });
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

/** VM-21: what anyone may know about a restaurant. No ids, no owner, no email. */
export const PublicRestaurant = z.object({ name: z.string(), slug: z.string() });
export type PublicRestaurant = z.infer<typeof PublicRestaurant>;

/** One role of one person at one restaurant (called a tenant in the database). */
export const StaffMember = z.object({
    _id: z.string(),
    name: z.string(),
    /** Their Firebase uid; null while the invite is pending (VM-12). */
    tenantId: z.string().nullable(),
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

/** VM-20: who is signed in, for the dashboards' headers. */
export const Me = z.object({ name: z.string(), email: z.string(), role: Role });
export type Me = z.infer<typeof Me>;

export const LoginResponse = z.object({ role: Role });
export const SignupResponse = z.object({ message: z.string(), slug: z.string() });
