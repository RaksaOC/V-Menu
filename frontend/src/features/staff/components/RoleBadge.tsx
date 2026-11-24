import { CreditCard, Crown, Users, Utensils } from "lucide-react";

const BADGE = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
const TONE: Record<string, string> = {
    owner: "bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]",
    chef: "bg-[var(--ok-soft)] text-[var(--ok)] border border-[var(--ok)]",
    cashier: "bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]",
};

function RoleIcon({ role }: { role: string }) {
    switch (role) {
        case "owner":
            return <Crown size={16} className="text-[var(--accent-text)]" />;
        case "chef":
            return <Utensils size={16} className="text-[var(--ok)]" />;
        case "cashier":
            return <CreditCard size={16} className="text-[var(--accent-text)]" />;
        default:
            return <Users size={16} className="text-[var(--muted)]" />;
    }
}

/** A staff member's role, as a coloured badge with its icon. */
export default function RoleBadge({ role }: { role: string }) {
    return (
        <span className={`${BADGE} ${TONE[role] ?? "bg-[var(--card)] text-[var(--ink)] border border-[var(--line)]"}`}>
            <RoleIcon role={role} />
            {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
    );
}
