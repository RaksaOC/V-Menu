import {useContext, useEffect, useState} from "react";
import api from "@/app/shared/lib/axios";
import {ResContext} from "@/app/owner/ResContext";
import {Users, Mail, Crown, Utensils, CreditCard, Calendar, Plus, Search, ChevronsUpDown, Pencil} from "lucide-react";
import {Listbox, ListboxButton, ListboxOption, ListboxOptions} from "@headlessui/react";
import AddStaffPopup from "@/app/owner/components/staff/AddStaffPopUp";
import EditStaffPopUp from "@/app/owner/components/staff/EditStaffPopUp";
import {TenantOutput} from "@/app/shared/types/Tenant";
import {prettyDate} from "@/app/shared/util/formatter";

export default function Staff() {
    const resSlug = useContext(ResContext);
    const [staff, setStaff] = useState<TenantOutput[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "cashier" | "chef">("all");
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [showEditStaff, setShowEditStaff] = useState(false);
    const [staffToEdit, setStaffToEdit] = useState<TenantOutput>();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/api/owner/${resSlug}/staff`);
                setStaff(response.data);
            } catch (error) {
                console.error("Error fetching staff:", error);
            } finally {
                setLoading(false);
            }
        };

        if (resSlug) {
            fetchData();
        }
    }, [resSlug]);

    function handleAddStaff() {
    }

    function handleEditStaff() {
    }

    function handleDeleteStaff() {
    }

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

    const filteredStaff = staff.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "all" || member.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleStats = () => {
        const stats = staff.reduce((acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return stats;
    };

    const roleStats = getRoleStats();

    if (loading) {
        return (
            <div className="p-4 sm:p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>

            <div className=" space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Management</h1>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your restaurant team members</p>
                    </div>
                    <button
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                        onClick={() => setShowAddStaff(!showAddStaff)}>
                        <Plus size={20}/>
                        <span className="sm:inline">Add Staff</span>
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                                <Users size={16} className="text-blue-600"/>
                            </div>
                            <div>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">{staff.length}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Total Staff</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg">
                                <Crown size={16} className="text-amber-600"/>
                            </div>
                            <div>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">{roleStats.owner || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Owners</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                                <Utensils size={16} className="text-green-600"/>
                            </div>
                            <div>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">{roleStats.chef || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Chefs</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                                <CreditCard size={16} className="text-blue-600"/>
                            </div>
                            <div>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">{roleStats.cashier || 0}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Cashiers</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
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
                            <div className="relative w-full sm:max-w-3xs">
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
                </div>

                {/* Staff Table - Desktop */}
                <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-center py-4 px-2   font-semibold text-gray-900">Staff Member</th>
                                <th className="text-center py-4 px-1 font-semibold text-gray-900">Role</th>
                                <th className="text-center py-4 px-1 font-semibold text-gray-900">Email</th>
                                <th className="text-center py-4 px-1 font-semibold text-gray-900">Joined</th>
                                <th className="text-center py-4 px-2 font-semibold text-gray-900">Modify</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users size={48} className="text-gray-300"/>
                                            <div>
                                                <p className="text-gray-500 font-medium">No staff members found</p>
                                                <p className="text-gray-400 text-sm">
                                                    {searchTerm || roleFilter !== "all"
                                                        ? "Try adjusting your search or filters"
                                                        : "Add your first team member to get started"
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((member) => (
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
                                                    {/*<p className="text-sm text-gray-500">ID: {member.tenantId}</p>*/}
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
                                        <td className="py-4 px-1">
                                            <div className="flex items-center gap-2 justify-center ">
                                                <div
                                                    onClick={() => {
                                                        setShowEditStaff(true)
                                                        setStaffToEdit(member)
                                                    }}
                                                    className="hover:bg-gray-200 p-3 rounded-full transition duration-200 ease-in-out cursor-pointer">
                                                    <Pencil size={20} className="text-gray-400  "/>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Staff Cards - Mobile */}
                <div className="lg:hidden space-y-3">
                    {filteredStaff.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <Users size={48} className="text-gray-300"/>
                                <div>
                                    <p className="text-gray-500 font-medium">No staff members found</p>
                                    <p className="text-gray-400 text-sm">
                                        {searchTerm || roleFilter !== "all"
                                            ? "Try adjusting your search or filters"
                                            : "Add your first team member to get started"
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        filteredStaff.map((member) => (
                            <div key={member.tenantId} className="bg-white rounded-xl border border-gray-200 p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div
                                        className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">
                                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 h-full">
                                            <div className={"flex items-center gap-2"}>
                                                <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                                {/*<p className="text-sm text-gray-500">ID: {member.tenantId}</p>*/}
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
                                            <span className="text-gray-900 text-sm truncate">{member.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} className="text-gray-400"/>
                                            <span
                                                className="text-gray-900 text-sm">{prettyDate(member.createdAt.toString(), false)}</span>
                                        </div>
                                    </div>

                                    <div
                                        className={"p-2 rounded-full flex items-center justify-center border border-gray-200 mr-2.5 hover:bg-gray-100 transition duration-200 ease-in-out cursor-pointer"}
                                        onClick={() => {
                                            setShowEditStaff(true)
                                            setStaffToEdit(member)
                                        }}>
                                        <Pencil size={16} className="text-gray-400"/>
                                    </div>
                                </div>


                            </div>
                        ))
                    )}
                </div>
            </div>
            {
                showAddStaff && (
                    <AddStaffPopup onClose={() => setShowAddStaff(!showAddStaff)} onSave={handleAddStaff}/>
                )
            }
            {
                showEditStaff && staffToEdit && (
                    <EditStaffPopUp tenant={staffToEdit} onSave={handleEditStaff} onClose={() => setShowEditStaff(false)}
                                    onDelete={handleDeleteStaff}/>
                )
            }
        </>
    );
}