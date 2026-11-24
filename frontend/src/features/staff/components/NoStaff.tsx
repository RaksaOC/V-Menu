import { Users } from "lucide-react";

const hint = (filtered: boolean) => (filtered ? "Try adjusting your search or filters" : "Add your first team member to get started");

/** "No staff members found": large in a table or a page, `small` in the phone list. */
export default function NoStaff({ filtered, small = false }: { filtered: boolean; small?: boolean }) {
    if (small)
        return (
            <div className="flex flex-col items-center gap-3">
                <Users size={48} className="text-[var(--muted)]" />
                <div>
                    <p className="text-[var(--muted)] font-medium">No staff members found</p>
                    <p className="text-[var(--muted)] text-sm">{hint(filtered)}</p>
                </div>
            </div>
        );
    return (
        <div className="flex flex-col items-center gap-3">
            <div className={"rounded-full bg-[var(--card)] p-6 mb-6"}>
                <Users size={48} className="text-[var(--muted)]" />
            </div>
            <div>
                <p className="text-[var(--body)] text-2xl font-bold">No staff members found</p>
                <p className="text-[var(--muted)]">{hint(filtered)}</p>
            </div>
        </div>
    );
}
