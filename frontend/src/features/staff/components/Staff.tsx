import { useContext, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { AddStaffBody, StaffMember } from "@vmenu/contracts";
import { addStaff, getStaff, removeStaff, updateStaff } from "@/features/staff/api";
import { apiErrorMessage, apiStatus } from "@/lib/api";
import { ResContext } from "@/lib/restaurant-context";
import StaffForm from "@/features/staff/components/StaffForm";
import { countRoles, filterStaff, type RoleFilter } from "../staff-list";
import NoStaff from "./NoStaff";
import StaffCard from "./StaffCard";
import StaffFilters from "./StaffFilters";
import StaffRow from "./StaffRow";
import StaffSkeleton from "./StaffSkeleton";
import StaffStats from "./StaffStats";

/** One restaurant's staff: counts, search and role filter, the list, and the add and edit forms. */
export default function Staff() {
    const resSlug = useContext(ResContext);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [showEditStaff, setShowEditStaff] = useState(false);
    const [staffToEdit, setStaffToEdit] = useState<StaffMember>();
    const [refresh, setRefresh] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [roleError, setRoleError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setStaff(await getStaff(resSlug));
            } catch (error) {
                console.error("Error fetching staff:", error);
            } finally {
                setLoading(false);
            }
        };

        if (resSlug) {
            fetchData();
        }
    }, [refresh]);

    // VM-12: an invite. No Firebase account is made here: creating one in this browser used to sign
    // the owner out and in as the new person. They make their own at /login with this email.
    async function handleAddStaff(invite: AddStaffBody) {
        setEmailError("");
        try {
            await addStaff(resSlug, invite);
            setShowAddStaff(false);
            setRefresh((prevState) => !prevState);
        } catch (error) {
            if (apiStatus(error) === 409) setEmailError(apiErrorMessage(error));
            else console.error("Error adding staff:", error);
        }
    }

    async function handleEditStaff(tenant: StaffMember) {
        setRoleError("");
        try {
            await updateStaff(resSlug, tenant);
            setShowEditStaff(false);
            setRefresh((prevState) => !prevState);
        } catch (error) {
            // VM-18: they already have that role here
            if (apiStatus(error) === 409) setRoleError(apiErrorMessage(error));
            else console.error("Error editing staff:", error);
        }
    }

    async function handleDeleteStaff(id: string) {
        try {
            await removeStaff(resSlug, id);
            setShowEditStaff(false);
            setRefresh((prevState) => !prevState);
        } catch (err) {
            console.error("Error deleting staff:", err);
        }
    }

    const edit = (member: StaffMember) => () => {
        setShowEditStaff(true);
        setStaffToEdit(member);
    };
    const filteredStaff = filterStaff(staff, searchTerm, roleFilter);
    const filtered = Boolean(searchTerm) || roleFilter !== "all";

    if (loading) return <StaffSkeleton />;

    return (
        <>
            <div className=" space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Staff Management</h1>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage your restaurant team members</p>
                    </div>
                    <button
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                        onClick={() => setShowAddStaff(!showAddStaff)}
                    >
                        <Plus size={20} />
                        <span className="sm:inline">Add Staff</span>
                    </button>
                </div>

                <StaffStats total={staff.length} roles={countRoles(staff)} />

                <StaffFilters
                    search={searchTerm}
                    onSearch={setSearchTerm}
                    role={roleFilter}
                    onRole={setRoleFilter}
                    selectWidth="sm:max-w-3xs"
                />

                {/* the table on wide screens */}
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
                                            <NoStaff filtered={filtered} />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStaff.map((member) => <StaffRow key={member._id} member={member} onEdit={edit(member)} />)
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* cards on phones */}
                <div className="lg:hidden space-y-3">
                    {filteredStaff.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                            <NoStaff filtered={filtered} small />
                        </div>
                    ) : (
                        filteredStaff.map((member) => (
                            <StaffCard
                                key={member._id}
                                member={member}
                                className="bg-white rounded-xl border border-gray-200 p-4"
                                onEdit={edit(member)}
                            />
                        ))
                    )}
                </div>
            </div>
            {showAddStaff && (
                <StaffForm
                    emailError={emailError}
                    onAdd={handleAddStaff}
                    onClose={() => {
                        setShowAddStaff(false);
                        setEmailError("");
                    }}
                />
            )}
            {showEditStaff && staffToEdit && (
                <StaffForm
                    member={staffToEdit}
                    roleError={roleError}
                    onSave={handleEditStaff}
                    onDelete={handleDeleteStaff}
                    onClose={() => {
                        setShowEditStaff(false);
                        setRoleError("");
                    }}
                />
            )}
        </>
    );
}
