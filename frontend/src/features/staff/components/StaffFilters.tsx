import type { ReactNode } from "react";
import { ChevronsUpDown, CreditCard, Crown, Search, Users, Utensils } from "lucide-react";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import type { RoleFilter } from "../staff-list";

const LABELS: Record<RoleFilter, string> = { all: "All Roles", owner: "Owners", chef: "Chefs", cashier: "Cashiers" };

function FilterIcon({ role }: { role: RoleFilter }) {
    if (role === "owner") return <Crown className="w-4 h-4 mr-2 text-yellow-500" />;
    if (role === "chef") return <Utensils className="w-4 h-4 mr-2 text-green-500" />;
    if (role === "cashier") return <CreditCard className="w-4 h-4 mr-2 text-blue-500" />;
    return <Users className="w-4 h-4 mr-2" />;
}

/** The search box and the role filter above a staff list. */
export default function StaffFilters({
    search,
    onSearch,
    role,
    onRole,
    className = "",
    selectWidth,
    children,
}: {
    search: string;
    onSearch: (value: string) => void;
    role: RoleFilter;
    onRole: (role: RoleFilter) => void;
    className?: string;
    selectWidth: string;
    children?: ReactNode;
}) {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-3 sm:p-4 ${className}`}>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search staff by name or email..."
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                </div>
                <Listbox value={role} onChange={onRole}>
                    <div className={`relative w-full ${selectWidth}`}>
                        <ListboxButton className="w-full px-3 sm:px-4 py-2 text-left border border-gray-200 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex justify-between items-center">
                            <span className="flex items-center">
                                <FilterIcon role={role} />
                                {LABELS[role]}
                            </span>
                            <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                        </ListboxButton>

                        <ListboxOptions className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none text-sm sm:text-base">
                            {(Object.keys(LABELS) as RoleFilter[]).map((value) => (
                                <ListboxOption
                                    key={value}
                                    value={value}
                                    className={({ active }) =>
                                        `cursor-pointer select-none px-4 py-2 flex items-center ${active ? "bg-blue-100" : ""}`
                                    }
                                >
                                    <FilterIcon role={value} />
                                    {LABELS[value]}
                                </ListboxOption>
                            ))}
                        </ListboxOptions>
                    </div>
                </Listbox>
            </div>
            {children}
        </div>
    );
}
