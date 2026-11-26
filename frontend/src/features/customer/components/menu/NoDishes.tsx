import { Store } from "lucide-react";

/** "No dishes yet": the restaurant has no dishes on its menu yet. */
export default function NoDishes() {
    return (
        <div className="col-span-full py-12 text-center">
            <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]">
                    <Store size={28} aria-hidden className="text-[var(--muted)]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">No Items Available</h3>
                <p className="text-[var(--muted)]">Check back later for our menu.</p>
            </div>
        </div>
    );
}
