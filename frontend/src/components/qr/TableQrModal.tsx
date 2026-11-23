"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, Printer, X } from "lucide-react";
import { tableUrl } from "@/lib/tableUrl";
import { printQrCards, qrDataUrl } from "@/components/qr/print";

interface Props {
    slug: string;
    tableName: string;
    /** Shown above the code; optional until there is a public restaurant-name lookup (VM-21). */
    restaurantName?: string;
    onClose: () => void;
}

/** The QR code for one table, with Download PNG and Print (VM-01). Used by owner and cashier. */
export default function TableQrModal({ slug, tableName, restaurantName, onClose }: Props) {
    const url = tableUrl(slug, tableName);
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        let live = true;
        qrDataUrl(url)
            .then((d) => live && setDataUrl(d))
            .catch(() => live && setFailed(true));
        return () => {
            live = false;
        };
    }, [url]);

    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const fileName = `${slug}-${tableName.replace(/[^\w-]+/g, "-")}-qr.png`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-6 text-[var(--ink)] shadow-xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        {restaurantName && <p className="text-sm font-semibold text-[var(--muted)]">{restaurantName}</p>}
                        <h2 id={titleId} className="font-mono text-3xl font-bold tracking-tight">
                            <span className="sr-only">QR code for table </span>
                            {tableName}
                        </h2>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--card)]"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="my-5 flex aspect-square items-center justify-center rounded-xl border border-[var(--line)] bg-white p-3">
                    {dataUrl && <img src={dataUrl} alt={`QR code for table ${tableName}`} className="h-full w-full [image-rendering:pixelated]" />}
                    {!dataUrl && !failed && <p className="text-sm text-[var(--muted)]">Making the code…</p>}
                    {failed && <p className="text-sm text-[var(--bad)]">Could not make the QR code. Please try again.</p>}
                </div>

                <p className="mb-5 break-all text-center font-mono text-xs text-[var(--muted)]">{url}</p>

                <div className="grid grid-cols-2 gap-3">
                    <a
                        href={dataUrl ?? undefined}
                        download={fileName}
                        aria-disabled={!dataUrl}
                        className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold hover:bg-[var(--card)]"
                    >
                        <Download size={16} /> Download PNG
                    </a>
                    <button
                        type="button"
                        onClick={() => printQrCards([{ restaurantName, tableName, url }])}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[var(--btn-bg)] px-4 py-3 text-sm font-semibold text-[var(--btn-ink)]"
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>
        </div>
    );
}
