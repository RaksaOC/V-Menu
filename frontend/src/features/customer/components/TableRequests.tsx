"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Receipt } from "lucide-react";
import type { TableRequestKind } from "@vmenu/contracts";
import { askStaff, getTableBill } from "@/features/customer/api";
import { apiErrorMessage } from "@/lib/api";

/** VM-30: a button works once per 2 minutes (the server checks it too). */
const AGAIN_AFTER_MS = 2 * 60_000;

const BUTTONS: { kind: TableRequestKind; label: string; done: string; told: string; Icon: typeof Receipt }[] = [
    {
        kind: "bill",
        label: "Request bill",
        done: "Bill requested",
        told: "We've told the staff you'd like the bill. Someone will bring it soon.",
        Icon: Receipt,
    },
    {
        kind: "staff",
        label: "Call staff",
        done: "Staff called",
        told: "We've called a staff member. Someone will be with you soon.",
        Icon: BellRing,
    },
];

/**
 * VM-30: "Request bill" and "Call staff" on the customer's menu. They show once the table has
 * ordered: the request goes on the table's open bill, where the cashier sees it.
 */
export default function TableRequests({ slug, table }: { slug: string; table: string }) {
    const [hasOrdered, setHasOrdered] = useState(false);
    const [sent, setSent] = useState<Record<TableRequestKind, boolean>>({ bill: false, staff: false });
    const [busy, setBusy] = useState<TableRequestKind | null>(null);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        let current = true;
        getTableBill(slug, table)
            .then((bill) => current && setHasOrdered(bill.orders.length > 0))
            .catch(() => {}); // no buttons then; the menu still works
        return () => {
            current = false;
        };
    }, [slug, table]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    if (!hasOrdered) return null;

    async function ask(kind: TableRequestKind, told: string) {
        setBusy(kind);
        setMessage(null);
        try {
            await askStaff(slug, table, kind);
            setSent((s) => ({ ...s, [kind]: true }));
            setMessage({ ok: true, text: told });
            timers.current.push(setTimeout(() => setSent((s) => ({ ...s, [kind]: false })), AGAIN_AFTER_MS));
        } catch (err) {
            setMessage({ ok: false, text: apiErrorMessage(err, "We couldn't reach the staff. Please wave to someone.") });
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="mt-5">
            <div className="flex flex-wrap justify-center gap-3">
                {BUTTONS.map(({ kind, label, done, told, Icon }) => (
                    <button
                        key={kind}
                        type="button"
                        disabled={sent[kind] || busy === kind}
                        onClick={() => ask(kind, told)}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-emerald-900/70"
                    >
                        <Icon size={18} aria-hidden />
                        {sent[kind] ? done : label}
                    </button>
                ))}
            </div>
            {message && (
                <p
                    role="status"
                    className={`mx-auto mt-3 max-w-md text-sm font-medium ${message.ok ? "text-white" : "rounded-lg bg-white px-3 py-2 text-red-700"}`}
                >
                    {message.text}
                </p>
            )}
        </div>
    );
}
