"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import type { RestaurantSettings } from "@vmenu/contracts";
import { DEFAULT_MONEY, formatMoney, type MoneySettings } from "@/lib/money";
import { getRestaurantSettings } from "@/lib/restaurant-settings";

// VM-24: every price on every page is shown in the restaurant's currency (USD, KHR or both). The
// restaurant's pages are wrapped in this provider (app/[res]/layout.tsx); the owner's dashboard
// wraps its own. Without one, or while the settings load, prices show in US dollars.
type Settings = MoneySettings & Partial<Pick<RestaurantSettings, "name" | "paymentQrUrl">>;
const SettingsContext = createContext<Settings | null>(null);

interface Props {
    /** the restaurant to load; by default the one in the URL */
    slug?: string;
    /** settings already known, for example the owner's choice before saving it */
    settings?: MoneySettings;
    children: ReactNode;
}

export function MoneyProvider({ slug, settings, children }: Props) {
    const params = useParams<{ res?: string }>();
    const target = settings ? undefined : (slug ?? params?.res);
    const [loaded, setLoaded] = useState<{ slug: string; value: RestaurantSettings }>();

    useEffect(() => {
        if (!target) return;
        let current = true;
        getRestaurantSettings(target)
            .then((value) => current && setLoaded({ slug: target, value }))
            .catch(() => {}); // prices stay in US dollars; the page shows its own error if the restaurant is gone
        return () => {
            current = false;
        };
    }, [target]);

    const value = settings ?? (loaded && loaded.slug === target ? loaded.value : null);
    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** The restaurant's settings, or null while they load (or outside a provider). */
export function useRestaurantSettings(): Settings | null {
    return useContext(SettingsContext);
}

/** Formats cents in the restaurant's currency: money(250) is "$2.50", "៛10,300" or "$2.50 · ៛10,300". */
export function useMoney(): (cents: number) => string {
    const settings = useContext(SettingsContext);
    return useCallback((cents: number) => formatMoney(cents, settings ?? DEFAULT_MONEY), [settings]);
}

/** A price, in the restaurant's currency. */
export function Price({ cents, className }: { cents: number; className?: string }) {
    return <strong className={className}>{useMoney()(cents)}</strong>;
}

/**
 * The money settings an owner's pages share across restaurants: the restaurants' own when they
 * all agree, else US dollars (adding up riel at different rates would mislead).
 */
export function sharedMoney(restaurants: { settings?: Partial<MoneySettings> | null }[]): MoneySettings {
    const each = restaurants.map((r) => ({
        currency: r.settings?.currency ?? DEFAULT_MONEY.currency,
        khrPerUsd: r.settings?.khrPerUsd ?? DEFAULT_MONEY.khrPerUsd,
    }));
    const [first] = each;
    return first && each.every((m) => m.currency === first.currency && m.khrPerUsd === first.khrPerUsd) ? first : DEFAULT_MONEY;
}
