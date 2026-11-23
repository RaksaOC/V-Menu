import { CheckCircle, Pencil, XCircle } from "lucide-react";
import { Card, Chip } from "@/components/ui";
import type { ItemOutput } from "@/lib/types/Item";

type Props = { item: ItemOutput } & ({ role: "owner"; onEdit: (item: ItemOutput) => void } | { role: "cashier"; onToggle: (item: ItemOutput) => void });

/** One dish, for the owner (edit) and the cashier (switch it on or off) (CL-09). */
export default function MenuCard(props: Props) {
    const { item } = props;
    return (
        <Card className="flex flex-col overflow-hidden p-0">
            <div className="relative">
                <img src={item.image} alt={item.name} className="h-44 w-full object-cover" />
                <Chip tone={item.isEnabled ? "ok" : "bad"} className="absolute right-3 top-3 bg-[var(--bg)]">
                    {item.isEnabled ? <CheckCircle size={12} aria-hidden /> : <XCircle size={12} aria-hidden />}
                    {item.isEnabled ? "Enabled" : "Disabled"}
                </Chip>
            </div>
            <div className="flex flex-1 items-end justify-between gap-3 p-4">
                <div className="min-w-0">
                    <h3 className="truncate font-semibold">{item.name}</h3>
                    <p className="text-lg font-bold text-[var(--ok)]">${item.price.toFixed(2)}</p>
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
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${item.isEnabled ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                )}
            </div>
        </Card>
    );
}
