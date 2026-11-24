import { ORDER_NOTE_MAX } from "@/features/customer/cart";

/** VM-28: the customer's note for the whole order. */
export default function KitchenNote({ value, onChange }: { value: string; onChange: (note: string) => void }) {
    return (
        <label className="mt-6 block">
            <span className="mb-1 block text-sm font-semibold text-gray-700">Note for the kitchen (optional)</span>
            <textarea
                aria-label="Note for the kitchen"
                maxLength={ORDER_NOTE_MAX}
                rows={2}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. it's a birthday, or bring the drinks first"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
        </label>
    );
}
