"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { navigation, signOut } from "@/lib/session";

/** VM-19: signs the chef out, for a tablet the whole kitchen shares. */
export default function KitchenSignOut({ slug }: { slug: string }) {
    const [busy, setBusy] = useState(false);

    async function leave() {
        setBusy(true);
        await signOut(); // the cookie goes first, so the login page doesn't open on a live session
        navigation.to(`/${slug}/kitchen/login`);
    }

    return (
        <div className="mb-4 flex justify-end">
            <button
                type="button"
                onClick={() => void leave()}
                disabled={busy}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
            >
                <LogOut size={16} aria-hidden />
                Sign Out
            </button>
        </div>
    );
}
