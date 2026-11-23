"use client";

import { useContext } from "react";
import { useParams } from "next/navigation";
import { ResContext, ResNameContext } from "@/features/owner/ResContext";

/**
 * The restaurant a shared screen is about (CL-09): the owner's dashboard says which one through
 * ResContext; staff pages have it in the URL (/<slug>/cashier/...).
 */
export function useRestaurantSlug(): string {
    const fromOwner = useContext(ResContext);
    const params = useParams();
    return fromOwner || String(params?.res ?? "");
}

/** The restaurant's display name when the screen knows it (the owner's dashboard), for QR cards (VM-01). */
export function useRestaurantName(): string | undefined {
    return useContext(ResNameContext) || undefined;
}
