"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChefHat } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";
import type { Order } from "@vmenu/contracts";
import { ToastHost } from "@/components/ui";
import ConnectionLostBar from "@/components/ui/ConnectionLostBar";
import { getActiveOrders, setOrderStatus } from "@/features/kitchen/api";
import { chimePlayer, type SoundPlayer } from "@/features/kitchen/kitchen-screen";
import { useKiosk } from "@/features/kitchen/use-kiosk";
import { apiErrorMessage } from "@/lib/api";
import { NEXT_STATUS } from "@/lib/order-status";
import { toast } from "@/lib/toast";
import { useConnectionStatus } from "@/lib/use-connection-status";
import { useWakeLock } from "@/lib/use-wake-lock";
import { ThemeToggle } from "@/components/marketing/tour/ThemeToggle";
import { BAND_BUTTON } from "@/features/kitchen/band";
import { KITCHEN_THEME_KEY } from "@/theme/ThemeSync";
import KitchenColumns from "./KitchenColumns";
import KitchenControls, { type SoundState } from "./KitchenControls";
import KitchenHeader from "./KitchenHeader";

/** VM-29: how long a new card stays marked (its border flashes once) */
const FRESH_MS = 4000;

interface Props {
    /** VM-10: every 5 s (was 2 s), and only the orders still to cook */
    pollMs?: number;
    /** VM-29: the new-order sound; tests pass a stub */
    sound?: SoundPlayer;
}

export default function KitchenPage({ pollMs = 5000, sound }: Props = {}) {
    const params = useParams();
    const slug = String(params.res);
    const { lost, succeeded, failed } = useConnectionStatus();
    const [orders, setOrders] = useState<Order[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const previousOrderIdsRef = useRef<string[]>([]);

    // VM-29: the kitchen screen
    const player = useMemo(() => sound ?? chimePlayer(), [sound]);
    const playerRef = useRef(player);
    playerRef.current = player;
    const [soundState, setSoundState] = useState<SoundState>("off");
    const [fresh, setFresh] = useState<string[]>([]);
    const { kiosk, toggleKiosk } = useKiosk();
    const [now, setNow] = useState(() => Date.now());
    const screenOn = useWakeLock();

    // the age chips move on even when no order changes
    useEffect(() => {
        const tick = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        const show = (activeOrders: Order[]) => {
            setOrders(activeOrders);
            setTotalOrders(activeOrders.length);
            previousOrderIdsRef.current = activeOrders.map((order: Order) => order._id);
            setNow(Date.now());
            succeeded();
        };
        const fetchOrders = async () => {
            try {
                show(await getActiveOrders(slug));
            } catch (err) {
                failed();
                console.error("Initial fetch error:", err);
            }
        };

        fetchOrders();

        const intervalId = setInterval(async () => {
            try {
                const activeOrders = await getActiveOrders(slug);

                const newOrders = activeOrders.filter((order: Order) => !previousOrderIdsRef.current.includes(order._id));
                if (newOrders.length > 0) {
                    toast.info(`${newOrders.length} new order${newOrders.length > 1 ? "s" : ""} received! 🔔`);
                    // VM-29: a sound (once Start service unlocked it) and a flash on each new card
                    playerRef.current.play();
                    const ids = newOrders.map((o: Order) => o._id);
                    setFresh((prev) => [...prev, ...ids]);
                    setTimeout(() => setFresh((prev) => prev.filter((id) => !ids.includes(id))), FRESH_MS);
                }
                show(activeOrders);
            } catch (err) {
                // VM-03: after 2 failures in a row the screen says so (a 401 goes to the login page)
                failed();
                console.error("Polling error:", err);
            }
        }, pollMs);

        return () => clearInterval(intervalId);
    }, [slug, pollMs, succeeded, failed]); // all stable: this runs once per board

    const startService = async () => setSoundState((await player.unlock()) ? "on" : "unavailable");

    // VM-27: one step on. Served orders leave the board; a refused step (409) says why and reloads.
    const advance = async (order: Order) => {
        const next = NEXT_STATUS[order.status];
        if (!next) return;
        try {
            const moved = await setOrderStatus(slug, order._id, next);
            setOrders((prev) =>
                next === "served" ? prev.filter((o) => o._id !== order._id) : prev.map((o) => (o._id === order._id ? moved : o)),
            );
            if (next === "served") setTotalOrders((prev) => prev - 1);
        } catch (err) {
            toast.error(apiErrorMessage(err, "Failed to update the order"));
            try {
                setOrders(await getActiveOrders(slug));
            } catch {
                /* the next poll will catch up */
            }
        }
    };

    // VM-29: the controls, in the big header or in kiosk mode's slim bar
    const controls = (
        <KitchenControls
            soundState={soundState}
            onStartService={startService}
            kiosk={kiosk}
            onToggleKiosk={toggleKiosk}
            screenOn={screenOn}
        />
    );

    return (
        <div data-kiosk={kiosk || undefined} className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
            {lost && <ConnectionLostBar />}
            {kiosk ? (
                <header className="vm-band flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                    <h1 className="flex items-center gap-3 font-[family-name:var(--f-display)] text-2xl font-semibold">
                        <ChefHat size={28} aria-hidden /> Kitchen · {totalOrders} active
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        {controls}
                        <ThemeToggle storageKey={KITCHEN_THEME_KEY} className={BAND_BUTTON} />
                    </div>
                </header>
            ) : (
                <KitchenHeader slug={slug} totalOrders={totalOrders} controls={controls} />
            )}

            <KitchenColumns orders={orders} fresh={fresh} kiosk={kiosk} now={now} onAdvance={advance} />

            <ToastHost />
        </div>
    );
}
