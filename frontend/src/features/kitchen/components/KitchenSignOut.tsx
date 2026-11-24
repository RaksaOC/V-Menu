"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { navigation, signOut } from "@/lib/session";
import { BAND_BUTTON } from "@/features/kitchen/band";

/** VM-19: signs the chef out, for a tablet the whole kitchen shares. */
export default function KitchenSignOut({ slug }: { slug: string }) {
    const [busy, setBusy] = useState(false);

    async function leave() {
        setBusy(true);
        await signOut(); // the cookie goes first, so the login page doesn't open on a live session
        navigation.to(`/${slug}/kitchen/login`);
    }

    return (
        <button type="button" onClick={() => void leave()} disabled={busy} className={BAND_BUTTON}>
            <LogOut size={16} aria-hidden />
            Sign Out
        </button>
    );
}
