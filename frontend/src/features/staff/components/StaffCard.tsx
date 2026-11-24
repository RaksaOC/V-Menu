import { Calendar, Mail, Pencil } from "lucide-react";
import type { StaffMember } from "@vmenu/contracts";
import { formatDate } from "@/lib/dates";
import { initials } from "../staff-list";
import InvitePending from "./InvitePending";
import RoleBadge from "./RoleBadge";

/** One member as a card, for phones. With `onEdit`, the card has an edit button. */
export default function StaffCard({ member, className, onEdit }: { member: StaffMember; className: string; onEdit?: () => void }) {
    return (
        <div data-member={member._id} className={className}>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 shrink-0 bg-[var(--accent-soft)] rounded-full flex items-center justify-center">
                    <span className="text-[var(--accent-text)] font-semibold text-sm">{initials(member.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--ink)] truncate">{member.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <RoleBadge role={member.role} />
                        <InvitePending member={member} />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between py-4">
                <div className="flex flex-col gap-1 items-start justify-center min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                        <Mail size={16} className="text-[var(--muted)] shrink-0" />
                        <span className="text-[var(--ink)] text-sm truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-[var(--muted)]" />
                        <span className="text-[var(--ink)] text-sm">{formatDate(member.createdAt)}</span>
                    </div>
                </div>

                {onEdit && (
                    <div
                        className={
                            "p-2 rounded-full flex items-center justify-center border border-[var(--line)] mr-2.5 hover:bg-[var(--card)] transition duration-200 ease-in-out cursor-pointer"
                        }
                        onClick={onEdit}
                    >
                        <Pencil size={16} className="text-[var(--muted)]" />
                    </div>
                )}
            </div>
        </div>
    );
}
