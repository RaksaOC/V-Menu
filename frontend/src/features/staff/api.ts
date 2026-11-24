import api, { seg } from "@/lib/api";
import type { AddStaffBody, StaffMember } from "@vmenu/contracts";

/** Staff grouped by restaurant, for the owner's "Staff management" page. */
export interface RestaurantStaff {
    resName: string;
    staff: StaffMember[];
}

export async function getAllStaff(): Promise<RestaurantStaff[]> {
    const { data } = await api.get<RestaurantStaff[]>("/api/staff");
    return data;
}

export async function getStaff(slug: string): Promise<StaffMember[]> {
    const { data } = await api.get<StaffMember[]>(`/api/restaurants/${seg(slug)}/staff`);
    return data;
}

/** VM-12: invites someone by email. They sign in at /login with it, and the invite is theirs. */
export async function addStaff(slug: string, member: AddStaffBody): Promise<void> {
    await api.post(`/api/restaurants/${seg(slug)}/staff`, member);
}

export async function updateStaff(slug: string, member: StaffMember): Promise<void> {
    await api.put(`/api/restaurants/${seg(slug)}/staff/${seg(member._id)}`, member);
}

export async function removeStaff(slug: string, memberId: string): Promise<void> {
    await api.delete(`/api/restaurants/${seg(slug)}/staff/${seg(memberId)}`);
}
