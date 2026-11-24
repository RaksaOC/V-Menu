"use client";

import { useContext } from "react";
import { useParams } from "next/navigation";
import { ResContext } from "@/lib/restaurantContext";

/**
 * The restaurant a shared screen is about (CL-09): the owner's dashboard says which one through
 * ResContext; staff pages have it in the URL (/<slug>/cashier/...).
 */
export function useRestaurantSlug(): string {
    const fromOwner = useContext(ResContext);
    const params = useParams();
    return fromOwner || String(params?.res ?? "");
}
