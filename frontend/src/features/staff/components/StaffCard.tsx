import { Calendar, Mail, Pencil } from "lucide-react";
import type { StaffMember } from "@vmenu/contracts";
import { formatDate } from "@/lib/dates";
import InvitePending from "./InvitePending";
import RoleBadge from "./RoleBadge";
import { initials } from "../staff-list";

/** One member as a card, for phones. With `onEdit`, the card has an edit button. */
export default function StaffCard({ member, className, onEdit }: { member: StaffMember; className: string; onEdit?: () => void }) {
    return (
        <div data-member={member._id} className={className}>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{initials(member.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{member.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={member.role} />
                        <InvitePending member={member} />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between py-4">
                <div className="flex flex-col gap-1 items-start justify-center min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                        <Mail size={16} className="text-gray-400 shrink-0" />
                        <span className="text-gray-900 text-sm truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-900 text-sm">{formatDate(member.createdAt)}</span>
                    </div>
                </div>

                {onEdit && (
                    <div
                        className={
                            "p-2 rounded-full flex items-center justify-center border border-gray-200 mr-2.5 hover:bg-gray-100 transition duration-200 ease-in-out cursor-pointer"
                        }
                        onClick={onEdit}
                    >
                        <Pencil size={16} className="text-gray-400" />
                    </div>
                )}
            </div>
        </div>
    );
}
