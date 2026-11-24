import { CreditCard, Crown, Users, Utensils } from "lucide-react";

const BADGE = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium";
const TONE: Record<string, string> = {
    owner: "bg-amber-100 text-amber-800 border border-amber-200",
    chef: "bg-green-100 text-green-800 border border-green-200",
    cashier: "bg-blue-100 text-blue-800 border border-blue-200",
};

function RoleIcon({ role }: { role: string }) {
    switch (role) {
        case "owner":
            return <Crown size={16} className="text-amber-600" />;
        case "chef":
            return <Utensils size={16} className="text-green-600" />;
        case "cashier":
            return <CreditCard size={16} className="text-blue-600" />;
        default:
            return <Users size={16} className="text-gray-500" />;
    }
}

/** A staff member's role, as a coloured badge with its icon. */
export default function RoleBadge({ role }: { role: string }) {
    return (
        <span className={`${BADGE} ${TONE[role] ?? "bg-gray-100 text-gray-800 border border-gray-200"}`}>
            <RoleIcon role={role} />
            {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
    );
}
