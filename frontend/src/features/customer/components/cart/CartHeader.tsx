import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/marketing/tour/ThemeToggle";

/** The cart's header (VM-33): the forest band, Back to the menu, the title and the light/dark switch. */
export default function CartHeader({ onBack }: { onBack: () => void }) {
    const outlined =
        "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--r-chip)] border border-white/30 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
    return (
        <header className="vm-band px-4 py-4 sm:px-6">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <button type="button" onClick={onBack} className={`${outlined} px-3 font-semibold`}>
                    <ArrowLeft size={18} aria-hidden />
                    Back
                </button>
                <h1 className="font-[family-name:var(--f-display)] text-2xl font-semibold tracking-[var(--d-track)]">Your Cart</h1>
                <ThemeToggle className={outlined} />
            </div>
        </header>
    );
}
