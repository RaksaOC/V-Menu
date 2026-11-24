"use client";

import { useEffect, useState } from "react";
import { CreditCard, House, Users, Utensils, type LucideIcon } from "lucide-react";
import { getAllStaff, type RestaurantStaff } from "@/features/staff/api";
import { countRoles, filterStaff, type RoleFilter } from "../staff-list";
import NoStaff from "./NoStaff";
import StaffCard from "./StaffCard";
import StaffFilters from "./StaffFilters";
import StaffRow from "./StaffRow";
import StaffSkeleton from "./StaffSkeleton";

function Tile({ icon: Icon, box, tone, label, value }: { icon: LucideIcon; box: string; tone: string; label: string; value: number }) {
    return (
        <div className="bg-[var(--bg)] rounded-xl border border-[var(--line)] p-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 ${box} rounded-lg`}>
                    <Icon size={20} className={tone} />
                </div>
                <div>
                    <p className="text-sm text-[var(--body)]">{label}</p>
                    <p className="text-xl font-bold text-[var(--ink)]">{value}</p>
                </div>
            </div>
        </div>
    );
}

/** The owner's staff across all their restaurants, grouped by restaurant. */
export default function AllStaff() {
    const [staffData, setStaffData] = useState<RestaurantStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setStaffData(await getAllStaff());
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const allStaff = staffData.flatMap((restaurant) => restaurant.staff);
    const groups = staffData
        .map((restaurant) => ({ resName: restaurant.resName, staff: filterStaff(restaurant.staff, searchTerm, roleFilter) }))
        .filter((restaurant) => restaurant.staff.length > 0);
    const roleStats = countRoles(allStaff);
    const totalStaff = allStaff.length;
    const totalFilteredStaff = groups.reduce((acc, restaurant) => acc + restaurant.staff.length, 0);

    if (loading) return <StaffSkeleton />;

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 place-items-stretch">
                <Tile icon={Users} box="bg-[var(--accent-soft)]" tone="text-[var(--accent-text)]" label="Total Staff" value={totalStaff} />
                <Tile icon={Utensils} box="bg-[var(--ok-soft)]" tone="text-[var(--ok)]" label="Chefs" value={roleStats.chef || 0} />
                <Tile
                    icon={CreditCard}
                    box="bg-[var(--accent-soft)]"
                    tone="text-[var(--accent-text)]"
                    label="Cashiers"
                    value={roleStats.cashier || 0}
                />
            </div>

            <StaffFilters
                search={searchTerm}
                onSearch={setSearchTerm}
                role={roleFilter}
                onRole={setRoleFilter}
                className="mb-6"
                selectWidth="sm:max-w-xs"
            >
                {totalFilteredStaff !== totalStaff && (
                    <div className="mt-3 text-sm text-[var(--body)]">
                        Showing {totalFilteredStaff} of {totalStaff} staff members
                    </div>
                )}
            </StaffFilters>

            <div className="space-y-6">
                {groups.length === 0 ? (
                    <div className="bg-[var(--bg)] rounded-xl border border-[var(--line)] p-12 text-center">
                        <NoStaff filtered={Boolean(searchTerm) || roleFilter !== "all"} />
                    </div>
                ) : (
                    groups.map((restaurant, index) => (
                        <div key={index} className="bg-[var(--bg)] rounded-xl border border-[var(--line)] overflow-hidden">
                            <div className="bg-[var(--card)] border-b border-[var(--line)] px-4 sm:px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[var(--accent-soft)] rounded-lg">
                                        <House size={20} className="text-[var(--accent-text)]" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-[var(--ink)]">{restaurant.resName}</h3>
                                        <p className="text-sm text-[var(--body)]">{restaurant.staff.length} staff members</p>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-[var(--card)] border-b border-[var(--line)]">
                                            <tr>
                                                <th className="text-center py-4 px-2 font-semibold text-[var(--ink)]">Staff Member</th>
                                                <th className="text-center py-4 px-1 font-semibold text-[var(--ink)]">Role</th>
                                                <th className="text-center py-4 px-1 font-semibold text-[var(--ink)]">Email</th>
                                                <th className="text-center py-4 px-1 font-semibold text-[var(--ink)]">Joined</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--line)]">
                                            {restaurant.staff.map((member) => (
                                                <StaffRow key={member._id} member={member} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="lg:hidden p-4 space-y-3">
                                {restaurant.staff.map((member) => (
                                    <StaffCard
                                        key={member._id}
                                        member={member}
                                        className="bg-[var(--card)] rounded-xl border border-[var(--line)] p-4"
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
