import { CheckCircle, Pencil, XCircle } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import { useMoney } from "@/components/money/MoneyProvider";
import type { MenuItem } from "@vmenu/contracts";

type Props = { item: MenuItem } & (
    { role: "owner"; onEdit: (item: MenuItem) => void } | { role: "cashier"; onToggle: (item: MenuItem) => void }
);

/** One dish, for the owner (edit) and the cashier (switch it on or off) (CL-09). */
export default function MenuCard(props: Props) {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const { item } = props;
    return (
        <Card padded={false} className="flex flex-col overflow-hidden">
            <div className="relative">
                <img src={item.image} alt={item.name} className="h-44 w-full object-cover" />
                <span className="absolute right-3 top-3 rounded-[var(--r-chip)] bg-[var(--bg)]">
                    <Chip tone={item.isEnabled ? "ok" : "bad"}>
                        {item.isEnabled ? <CheckCircle size={12} aria-hidden /> : <XCircle size={12} aria-hidden />}
                        {item.isEnabled ? "Enabled" : "Disabled"}
                    </Chip>
                </span>
            </div>
            <div className="flex flex-1 items-end justify-between gap-3 p-4">
                <div className="min-w-0">
                    <h3 className="line-clamp-2 font-semibold leading-snug">{item.name}</h3>
                    <p className="text-lg font-bold text-[var(--ok)]">{money(item.priceCents)}</p>
                </div>
                {props.role === "owner" ? (
                    <button
                        type="button"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => props.onEdit(item)}
                        className="rounded-[var(--r-chip)] p-2 text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--ink)]"
                    >
                        <Pencil size={18} aria-hidden />
                    </button>
                ) : (
                    <button
                        type="button"
                        role="switch"
                        aria-checked={item.isEnabled}
                        aria-label={`${item.name} available`}
                        onClick={() => props.onToggle(item)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${item.isEnabled ? "bg-[var(--ok)]" : "bg-[var(--line)]"}`}
                    >
                        <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${item.isEnabled ? "left-[22px]" : "left-0.5"}`}
                        />
                    </button>
                )}
            </div>
        </Card>
    );
}
