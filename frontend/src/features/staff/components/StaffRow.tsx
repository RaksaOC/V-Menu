import { Calendar, Mail, Pencil } from "lucide-react";
import type { StaffMember } from "@vmenu/contracts";
import { formatDate } from "@/lib/dates";
import { initials } from "../staff-list";
import InvitePending from "./InvitePending";
import RoleBadge from "./RoleBadge";

/** One member in the desktop staff table. With `onEdit`, the last cell is an edit button. */
export default function StaffRow({ member, onEdit }: { member: StaffMember; onEdit?: () => void }) {
    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="py-4 px-2">
                <div className="flex items-center gap-2 justify-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">{initials(member.name)}</span>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <InvitePending member={member} />
                    </div>
                </div>
            </td>
            <td className="py-4 px-1 text-center">
                <RoleBadge role={member.role} />
            </td>
            <td className="py-4 px-1">
                <div className="flex items-center gap-2 justify-center">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-900">{member.email}</span>
                </div>
            </td>
            <td className="py-4 px-1">
                <div className="flex items-center gap-2 justify-center">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-900">{formatDate(member.createdAt)}</span>
                </div>
            </td>
            {onEdit && (
                <td className="py-4 px-1">
                    <div className="flex items-center gap-2 justify-center ">
                        <div
                            onClick={onEdit}
                            className="hover:bg-gray-200 p-3 rounded-full transition duration-200 ease-in-out cursor-pointer"
                        >
                            <Pencil size={20} className="text-gray-400  " />
                        </div>
                    </div>
                </td>
            )}
        </tr>
    );
}
