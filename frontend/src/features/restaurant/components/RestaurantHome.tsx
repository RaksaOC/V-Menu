"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QrCode } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui";
import { apiStatus, seg } from "@/lib/api";
import { getPublicRestaurant } from "@/lib/public-restaurant";

type State = { kind: "loading" } | { kind: "ready"; name: string } | { kind: "unknown" } | { kind: "error" };

const STAFF_LINK =
    "inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--r-chip)] border border-[var(--line)] px-4 text-sm font-medium text-[var(--ink)] hover:bg-[var(--card)]";

/** /<slug> (VM-32): the real restaurant, how customers order, and the way in for staff. */
export default function RestaurantHome() {
    const params = useParams();
    const slug = String(params.res ?? "");
    const [state, setState] = useState<State>({ kind: "loading" });

    const load = useCallback(async () => {
        setState({ kind: "loading" });
        try {
            const { name } = await getPublicRestaurant(slug);
            document.title = name;
            setState({ kind: "ready", name });
        } catch (err) {
            setState({ kind: apiStatus(err) === 404 ? "unknown" : "error" });
        }
    }, [slug]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-10 text-[var(--ink)]">
            <Card className="w-full max-w-md space-y-6 text-center">
                {state.kind === "loading" && <Skeleton variant="overview" count={1} />}
                {state.kind === "unknown" && (
                    <>
                        <h1 className="text-xl font-semibold">We couldn&apos;t find this restaurant</h1>
                        <p className="text-sm text-[var(--muted)]">Check the link, or scan the QR code on your table again.</p>
                    </>
                )}
                {state.kind === "error" && (
                    <>
                        <h1 className="text-xl font-semibold">Something went wrong</h1>
                        <p className="text-sm text-[var(--muted)]">We couldn&apos;t load this restaurant.</p>
                        <Button onClick={load}>Try again</Button>
                    </>
                )}
                {state.kind === "ready" && (
                    <>
                        <h1 className="text-3xl font-semibold tracking-tight">{state.name}</h1>
                        <div className="flex items-center justify-center gap-3 rounded-[var(--r-card)] bg-[var(--card)] p-4 text-sm">
                            <QrCode size={22} aria-hidden className="shrink-0" />
                            <p>Scan the QR code on your table to order</p>
                        </div>
                        <nav aria-label="Staff" className="space-y-2">
                            <h2 className="font-[family-name:var(--f-label)] text-xs uppercase tracking-[var(--label-track)] text-[var(--muted)]">
                                For staff
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <Link href={`/${seg(slug)}/cashier/login`} className={STAFF_LINK}>
                                    Cashier login
                                </Link>
                                <Link href={`/${seg(slug)}/kitchen/login`} className={STAFF_LINK}>
                                    Kitchen login
                                </Link>
                            </div>
                        </nav>
                    </>
                )}
            </Card>
        </main>
    );
}
