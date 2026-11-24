import { useId } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import { PHOTO_TYPES, usePhoto } from "./use-photo";

/** The dish photo: a preview, Choose Image, the upload's progress and any error (VM-02). */
export default function PhotoField({
    photo,
    original,
    error,
}: {
    photo: ReturnType<typeof usePhoto>;
    /** the item's saved photo, which "remove" goes back to */
    original: string;
    error?: string;
}) {
    const fileId = useId();
    return (
        <div className="space-y-2">
            <span className="block text-sm font-semibold">Item Image</span>
            <div className="flex items-start gap-4">
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-card)] border border-dashed border-[var(--line)] bg-[var(--card)]">
                    {photo.preview ? (
                        <>
                            <img src={photo.preview} alt="Preview" className="h-full w-full object-cover" />
                            <button
                                type="button"
                                aria-label="Remove the chosen photo"
                                onClick={() => photo.reset(original)}
                                className="absolute right-1.5 top-1.5 rounded-full bg-[var(--bad)] p-1 text-white"
                            >
                                <X size={12} aria-hidden />
                            </button>
                        </>
                    ) : (
                        <ImageIcon size={24} aria-hidden className="text-[var(--muted)]" />
                    )}
                </div>
                <div className="space-y-2 text-sm">
                    <input id={fileId} type="file" accept={PHOTO_TYPES} onChange={photo.choose} className="sr-only" />
                    <label
                        htmlFor={fileId}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--r-chip)] border border-[var(--line)] px-3 py-2 font-medium hover:bg-[var(--card)]"
                    >
                        <Upload size={16} aria-hidden /> Choose Image
                    </label>
                    <p className="text-xs text-[var(--muted)]">JPG, PNG or WebP, up to 5 MB</p>
                    {photo.progress !== null && (
                        <p className="text-xs text-[var(--accent-text)]" aria-live="polite">
                            Uploading… {photo.progress}%
                        </p>
                    )}
                    {(photo.error || error) && (
                        <p role="alert" className="text-xs text-[var(--bad)]">
                            {photo.error || error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
