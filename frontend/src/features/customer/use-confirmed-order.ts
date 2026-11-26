"use client";

import { useCallback, useEffect, useState } from "react";
import { getTableBill, getTableOrder, type TableBill, type TableOrderView } from "@/features/customer/api";
import type { TableLink } from "@/features/customer/table-link";
import { apiErrorMessage, apiStatus } from "@/lib/api";
import { isFinal } from "@/lib/order-status";

/**
 * VM-07: the order the customer just placed, and the table's orders so far. VM-27: checked again
 * every `pollMs` until its status can't change any more.
 *
 * A failed check doesn't stick: the next good one clears the error, and while there's an order to
 * show, the page keeps showing it (the caller shows `error` only without an order). An order that
 * isn't there (404) stops the checks: asking again every 10 seconds can't bring it back.
 */
export function useConfirmedOrder(link: TableLink, orderId: string, pollMs: number) {
    const [order, setOrder] = useState<TableOrderView | null>(null);
    const [bill, setBill] = useState<TableBill | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [gone, setGone] = useState(false);

    const finished = gone || (order ? isFinal(order.status) : false);
    const load = useCallback(() => {
        getTableOrder(link, orderId)
            .then((found) => {
                setOrder(found);
                setError(null);
            })
            .catch((err) => {
                setError(apiErrorMessage(err, "Couldn't load this order."));
                if (apiStatus(err) === 404) {
                    setGone(true);
                    setOrder(null); // it isn't there any more: say so instead of showing it
                }
            });
        getTableBill(link)
            .then(setBill)
            .catch(() => setBill(null)); // the list is a bonus; the order above is what matters
        // eslint-disable-next-line react-hooks/exhaustive-deps -- link is rebuilt each render; its parts are listed
    }, [link.slug, link.token, link.name, orderId]);

    // once when the page opens
    useEffect(load, [load]);

    // VM-27: then every pollMs, until the status can't change any more. Its own effect, so
    // reaching a final status only stops the timer and doesn't load once more.
    useEffect(() => {
        if (finished) return;
        const timer = setInterval(load, pollMs);
        return () => clearInterval(timer);
    }, [load, pollMs, finished]);

    return { order, bill, error };
}
