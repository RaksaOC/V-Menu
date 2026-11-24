import type { ReactNode } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { ThemeToggle } from "@/components/marketing/tour/ThemeToggle";
import { KITCHEN_THEME_KEY } from "@/theme/ThemeSync";
import { BAND_BUTTON } from "@/features/kitchen/band";
import KitchenSignOut from "./KitchenSignOut";

/** The kitchen's header (VM-34): the band with the title, the count, the history, the light/dark
 *  switch, sign out, and the controls. */
export default function KitchenHeader({ slug, totalOrders, controls }: { slug: string; totalOrders: number; controls: ReactNode }) {
    return (
        <header className="vm-band px-4 py-5 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-[family-name:var(--f-display)] text-3xl font-semibold tracking-[var(--d-track)]">Kitchen</h1>
                        <p className="mt-1 font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] text-white/80">
                            Active orders · <span className="text-white">{totalOrders}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/${slug}/kitchen/history`} className={BAND_BUTTON}>
                            <History size={18} aria-hidden />
                            View History
                        </Link>
                        <ThemeToggle storageKey={KITCHEN_THEME_KEY} className={BAND_BUTTON} />
                        <KitchenSignOut slug={slug} />
                    </div>
                </div>
                {controls && <div className="mt-4">{controls}</div>}
            </div>
        </header>
    );
}
