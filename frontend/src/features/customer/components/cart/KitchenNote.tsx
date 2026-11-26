import { ORDER_NOTE_MAX } from "@/features/customer/cart";

/** VM-28: the customer's note for the whole order. */
export default function KitchenNote({ value, onChange }: { value: string; onChange: (note: string) => void }) {
    return (
        <label className="mt-6 block">
            <span className="mb-1 block font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] text-[var(--muted)]">
                Note for the kitchen (optional)
            </span>
            <textarea
                aria-label="Note for the kitchen"
                maxLength={ORDER_NOTE_MAX}
                rows={2}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. it's a birthday, or bring the drinks first"
                className="w-full rounded-[var(--r-in)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-mid)]"
            />
        </label>
    );
}
