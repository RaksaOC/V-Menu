import type { StaffMember } from "@vmenu/contracts";

// Helpers for the staff lists (one restaurant's, and the owner's across restaurants).

export type RoleFilter = "all" | "owner" | "cashier" | "chef";

/** "Sok Dara" -> "SD", for the round avatar. */
export const initials = (name: string) =>
    name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

/** The members whose name or email contains the search, with the chosen role. */
export function filterStaff<T extends Pick<StaffMember, "name" | "email" | "role">>(staff: T[], search: string, role: RoleFilter): T[] {
    const lower = search.toLowerCase();
    return staff.filter(
        (m) => (m.name.toLowerCase().includes(lower) || m.email.toLowerCase().includes(lower)) && (role === "all" || m.role === role),
    );
}

/** How many members have each role. */
export const countRoles = (staff: Pick<StaffMember, "role">[]) =>
    staff.reduce(
        (acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>,
    );
