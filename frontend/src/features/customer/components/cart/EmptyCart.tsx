import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui";

/** "Your cart is empty", with a way back to the menu. */
export default function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
    return (
        <div className="py-16 text-center">
            <div className="mx-auto max-w-md">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]">
                    <ShoppingBag size={28} aria-hidden className="text-[var(--muted)]" />
                </div>
                <h2 className="mb-2 font-[family-name:var(--f-display)] text-2xl font-semibold">Your cart is empty</h2>
                <p className="mb-6 text-[var(--muted)]">Add a dish from the menu to start your order.</p>
                <Button variant="solid" className="min-h-11 px-6" onClick={onBrowse}>
                    Browse Menu
                </Button>
            </div>
        </div>
    );
}
