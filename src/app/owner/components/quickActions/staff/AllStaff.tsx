'use client'

import {useEffect, useState} from "react";
import api from "@/app/shared/lib/axios";
import {
    Calendar,
    ChevronsUpDown,
    CreditCard,
    Crown,
    Mail,
    Pencil,
    Search,
    Users,
    Utensils,
    Building2, House
} from "lucide-react";
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from "@headlessui/react";
import {prettyDate} from "@/app/shared/util/formatter";
import {TenantOutput} from "@/app/shared/types/Tenant";

// Type for grouped staff data
interface RestaurantStaff {
    resName: string;
    staff: TenantOutput[];
}

const getRoleBadge = (role: string) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
    switch (role) {
        case "owner":
            return `${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`;
        case "chef":
            return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
        case "cashier":
            return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
        default:
            return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
};

const getRoleIcon = (role: string) => {
    switch (role) {
        case "owner":
            return <Crown size={16} className="text-amber-600"/>;
        case "chef":
            return <Utensils size={16} className="text-green-600"/>;
        case "cashier":
            return <CreditCard size={16} className="text-blue-600"/>;
        default:
            return <Users size={16} className="text-gray-500"/>;
    }
};

export default function AllStaff() {
    const [staffData, setStaffData] = useState<RestaurantStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "cashier" | "chef">("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get("/api/owner/staff");
                setStaffData(response.data);
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    console.log("staff data is", staffData);
    // Transform array of arrays into grouped restaurant data
    const groupedStaff: RestaurantStaff[] = staffData.map((restaurantStaff) => ({
        resName: restaurantStaff.resName,
        staff: restaurantStaff.staff
    }));

    console.log("grouped staff is", groupedStaff);

    const allStaff = staffData.flatMap((restaurant) => restaurant.staff);

    const lowerSearch = searchTerm.toLowerCase();

    console.log("Search:", searchTerm, "Role:", roleFilter);

    groupedStaff.forEach(r => {
        console.log("Restaurant:", r.resName);
        console.log(r.staff);
        r.staff.forEach(m => {
            console.log(" -", m.name, "| Match?",
                m.name.toLowerCase().includes(lowerSearch),
                m.email.toLowerCase().includes(lowerSearch),
                roleFilter === "all" || m.role === roleFilter);
        });
    });

    const filteredGroupedStaff = groupedStaff
        .map(restaurant => {
            const filteredStaff = restaurant.staff.filter(member => {
                const nameMatch = member.name.toLowerCase().includes(lowerSearch);
                const emailMatch = member.email.toLowerCase().includes(lowerSearch);
                const roleMatch = roleFilter === "all" || member.role === roleFilter;
                return (nameMatch || emailMatch) && roleMatch;
            });

            return {...restaurant, staff: filteredStaff};
        })
        .filter(restaurant => restaurant.staff.length > 0);

    console.log("after filtering", filteredGroupedStaff);

    const getRoleStats = () => {
        const stats = allStaff.reduce((acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return stats;
    };

    const roleStats = getRoleStats();
    const totalStaff = allStaff.length;
    const totalFilteredStaff = filteredGroupedStaff.reduce((acc, restaurant) => acc + restaurant.staff.length, 0);

    if (loading) {
        return (
            <div className="p-4 sm:p-6 space-y-6 animate-pulse">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="h-6 sm:h-8 w-40 bg-gray-200 rounded"></div>
                        <div className="h-4 w-60 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 space-y-2">
                            <div className="h-4 w-10 bg-gray-200 rounded"></div>
                            <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>

                {/* Filter/Search Bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="h-10 bg-gray-200 rounded w-full"></div>
                        <div className="h-10 bg-gray-200 rounded w-full sm:w-40"></div>
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="hidden lg:block bg-white rounded-xl border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {[...Array(5)].map((_, i) => (
                                    <th key={i} className="py-4 px-2">
                                        <div className="h-4 w-20 bg-gray-200 rounded mx-auto"></div>
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {[...Array(4)].map((_, i) => (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    {[...Array(5)].map((_, j) => (
                                        <td key={j} className="py-4 px-2 text-center">
                                            <div className="h-4 w-24 bg-gray-200 rounded mx-auto"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6 place-items-stretch">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users size={20} className="text-blue-600"/>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Staff</p>
                            <p className="text-xl font-bold text-gray-900">{totalStaff}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Utensils size={20} className="text-green-600"/>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Chefs</p>
                            <p className="text-xl font-bold text-gray-900">{roleStats?.chef || 0}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <CreditCard size={20} className="text-blue-600"/>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Cashiers</p>
                            <p className="text-xl font-bold text-gray-900">{roleStats?.cashier || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-1 relative">
                        <Search size={18}
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                        <input
                            type="text"
                            placeholder="Search staff by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        />
                    </div>
                    <Listbox value={roleFilter} onChange={setRoleFilter}>
                        <div className="relative w-full sm:max-w-xs">
                            <ListboxButton
                                className="w-full px-3 sm:px-4 py-2 text-left border border-gray-200 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center">
                            <span className="flex items-center">
                              {roleFilter === "owner" && <Crown className="w-4 h-4 mr-2 text-yellow-500"/>}
                                {roleFilter === "chef" && <Utensils className="w-4 h-4 mr-2 text-green-500"/>}
                                {roleFilter === "cashier" && <CreditCard className="w-4 h-4 mr-2 text-blue-500"/>}
                                {roleFilter === "all" && <Users className="w-4 h-4 mr-2"/>}
                                {{
                                    all: "All Roles",
                                    owner: "Owners",
                                    chef: "Chefs",
                                    cashier: "Cashiers",
                                }[roleFilter]}
                            </span>
                                <ChevronsUpDown className="w-4 h-4 text-gray-400"/>
                            </ListboxButton>

                            <ListboxOptions
                                className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none text-sm sm:text-base">
                                <ListboxOption value="all" className={({active}) =>
                                    `cursor-pointer select-none px-4 py-2 flex items-center ${active ? 'bg-blue-100' : ''}`
                                }>
                                    <Users className="w-4 h-4 mr-2"/>
                                    All Roles
                                </ListboxOption>

                                <ListboxOption value="owner" className={({active}) =>
                                    `cursor-pointer select-none px-4 py-2 flex items-center ${active ? 'bg-blue-100' : ''}`
                                }>
                                    <Crown className="w-4 h-4 mr-2 text-yellow-500"/>
                                    Owners
                                </ListboxOption>

                                <ListboxOption value="chef" className={({active}) =>
                                    `cursor-pointer select-none px-4 py-2 flex items-center ${active ? 'bg-blue-100' : ''}`
                                }>
                                    <Utensils className="w-4 h-4 mr-2 text-green-500"/>
                                    Chefs
                                </ListboxOption>

                                <ListboxOption value="cashier" className={({active}) =>
                                    `cursor-pointer select-none px-4 py-2 flex items-center ${active ? 'bg-blue-100' : ''}`
                                }>
                                    <CreditCard className="w-4 h-4 mr-2 text-blue-500"/>
                                    Cashiers
                                </ListboxOption>
                            </ListboxOptions>
                        </div>
                    </Listbox>
                </div>
                {totalFilteredStaff !== totalStaff && (
                    <div className="mt-3 text-sm text-gray-600">
                        Showing {totalFilteredStaff} of {totalStaff} staff members
                    </div>
                )}
            </div>

            {/* Restaurant Groups */}
            <div className="space-y-6">
                {filteredGroupedStaff.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="rounded-full bg-gray-100 p-6 mb-6">
                                <Users size={48} className="text-gray-400"/>
                            </div>
                            <div>
                                <p className="text-gray-600 text-2xl font-bold">No staff members found</p>
                                <p className="text-gray-500">
                                    {searchTerm || roleFilter !== "all"
                                        ? "Try adjusting your search or filters"
                                        : "Add your first team member to get started"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    filteredGroupedStaff.map((restaurant, index) => (
                        <div key={index}
                             className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Restaurant Header */}
                            <div className="bg-gray-50 border-b border-gray-200 px-4 sm:px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <House size={20} className="text-blue-600"/>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{restaurant.resName}</h3>
                                        <p className="text-sm text-gray-600">{restaurant.staff.length} staff members</p>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden lg:block">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-center py-4 px-2 font-semibold text-gray-900">Staff
                                                Member
                                            </th>
                                            <th className="text-center py-4 px-1 font-semibold text-gray-900">Role</th>
                                            <th className="text-center py-4 px-1 font-semibold text-gray-900">Email</th>
                                            <th className="text-center py-4 px-1 font-semibold text-gray-900">Joined</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                        {restaurant.staff.map((member) => (
                                            <tr key={member._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-4 px-2">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <div
                                                            className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <span className="text-blue-600 font-semibold text-sm">
                                                                {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{member.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-1 text-center">
                                                    <span className={getRoleBadge(member.role)}>
                                                        {getRoleIcon(member.role)}
                                                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-1">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <Mail size={16} className="text-gray-400"/>
                                                        <span className="text-gray-900">{member.email}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-1">
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <Calendar size={16} className="text-gray-400"/>
                                                        <span
                                                            className="text-gray-900">{prettyDate(member.createdAt.toString(), false)}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Cards */}
                            <div className="lg:hidden p-4 space-y-3">
                                {restaurant.staff.map((member) => (
                                    <div key={member._id} className="bg-gray-50 rounded-xl border border-gray-100 p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div
                                                className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 font-semibold text-sm">
                                                {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 h-full">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                                    </div>
                                                    <span className={getRoleBadge(member.role)}>
                                                    {getRoleIcon(member.role)}
                                                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between py-4">
                                            <div className="flex flex-col gap-1 items-start justify-center">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={16} className="text-gray-400"/>
                                                    <span
                                                        className="text-gray-900 text-sm truncate">{member.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={16} className="text-gray-400"/>
                                                    <span
                                                        className="text-gray-900 text-sm">{prettyDate(member.createdAt.toString(), false)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}