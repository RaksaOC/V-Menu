"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { apiErrorMessage } from "@/lib/api";
import { uploadMenuPhoto } from "@/features/restaurant/api";
import { useRestaurantSlug } from "@/features/restaurant/useRestaurantSlug";

export const PHOTO_TYPES = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * The photo field of the add and edit item popups (VM-02). The chosen file is previewed locally
 * and only uploaded on Save; `upload()` returns its URL, or null when no new file was chosen.
 */
export function usePhoto(initial = "") {
    const slug = useRestaurantSlug();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState(initial);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState<number | null>(null);

    useEffect(
        () => () => {
            if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
        },
        [preview],
    );

    function choose(e: ChangeEvent<HTMLInputElement>) {
        const chosen = e.target.files?.[0];
        if (!chosen) return;
        const problem =
            chosen.size > MAX_BYTES
                ? "Photos can be at most 5 MB"
                : !PHOTO_TYPES.split(",").includes(chosen.type)
                  ? "Please choose a JPG, PNG or WebP photo"
                  : "";
        if (problem) {
            setError(problem);
            e.target.value = "";
            return;
        }
        setError("");
        setFile(chosen);
        setPreview(URL.createObjectURL(chosen));
    }

    function reset(to = "") {
        setFile(null);
        setPreview(to);
        setError("");
    }

    /** Uploads the chosen file. Throws (with `error` set for the form) when the upload fails. */
    async function upload(): Promise<string | null> {
        if (!file) return null;
        setError("");
        setProgress(0);
        try {
            return await uploadMenuPhoto(slug, file, setProgress);
        } catch (err) {
            setError(apiErrorMessage(err, "Could not upload the photo. Please try again."));
            throw err;
        } finally {
            setProgress(null);
        }
    }

    return { file, preview, error, progress, choose, reset, upload };
}
