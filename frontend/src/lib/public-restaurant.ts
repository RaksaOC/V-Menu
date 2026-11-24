"use client";

import { useEffect, useState } from "react";
import api, { seg } from "@/lib/api";
import type { PublicRestaurant } from "@vmenu/contracts";

/** VM-21: a restaurant's public details (no sign-in). Shared by the customer and staff screens. */
export async function getPublicRestaurant(slug: string): Promise<PublicRestaurant> {
    const { data } = await api.get<PublicRestaurant>(`/api/restaurants/${seg(slug)}/public`);
    return data;
}

/** The restaurant's name: undefined while loading, null if it couldn't be loaded. */
export function useRestaurantName(slug: string): string | null | undefined {
    const [loaded, setLoaded] = useState<{ slug: string; name: string | null }>();
    useEffect(() => {
        if (!slug) return;
        let current = true;
        getPublicRestaurant(slug)
            .then(({ name }) => current && setLoaded({ slug, name }))
            .catch(() => current && setLoaded({ slug, name: null }));
        return () => {
            current = false;
        };
    }, [slug]);
    return loaded?.slug === slug ? loaded.name : undefined;
}
