import type { LucideIcon } from "lucide-react";
import { CreditCard, Crown, Users, Utensils } from "lucide-react";

const TILES: { label: string; icon: LucideIcon; tone: string; count: (total: number, roles: Record<string, number>) => number }[] = [
    { label: "Total Staff", icon: Users, tone: "blue", count: (total) => total },
    { label: "Owners", icon: Crown, tone: "amber", count: (_, roles) => roles.owner || 0 },
    { label: "Chefs", icon: Utensils, tone: "green", count: (_, roles) => roles.chef || 0 },
    { label: "Cashiers", icon: CreditCard, tone: "blue", count: (_, roles) => roles.cashier || 0 },
];
const BOX: Record<string, string> = { blue: "bg-[var(--accent-soft)]", amber: "bg-[var(--accent-soft)]", green: "bg-[var(--ok-soft)]" };
const ICON: Record<string, string> = { blue: "text-[var(--accent-text)]", amber: "text-[var(--accent-text)]", green: "text-[var(--ok)]" };

/** The four counts above one restaurant's staff list. */
export default function StaffStats({ total, roles }: { total: number; roles: Record<string, number> }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {TILES.map(({ label, icon: Icon, tone, count }) => (
                <div key={label} className="bg-[var(--bg)] rounded-xl border border-[var(--line)] p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`p-1.5 sm:p-2 ${BOX[tone]} rounded-lg`}>
                            <Icon size={16} className={ICON[tone]} />
                        </div>
                        <div>
                            <p className="text-lg sm:text-2xl font-bold text-[var(--ink)]">{count(total, roles)}</p>
                            <p className="text-xs sm:text-sm text-[var(--body)]">{label}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
