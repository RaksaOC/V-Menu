"use client";

import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { tableUrl } from "@/lib/table-url";
import { printQrCards, qrDataUrl } from "@/components/qr/print";

interface Props {
    slug: string;
    tableName: string;
    /** Shown above the code and on the printed card (VM-21). */
    restaurantName?: string;
    onClose: () => void;
}

/** The QR code for one table, with Download PNG and Print (VM-01). Used by owner and cashier. */
export default function TableQrModal({ slug, tableName, restaurantName, onClose }: Props) {
    const url = tableUrl(slug, tableName);
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let live = true;
        qrDataUrl(url)
            .then((d) => live && setDataUrl(d))
            .catch(() => live && setFailed(true));
        return () => {
            live = false;
        };
    }, [url]);

    const fileName = `${slug}-${tableName.replace(/[^\w-]+/g, "-")}-qr.png`;

    return (
        <Modal
            size="sm"
            onClose={onClose}
            title={
                <span className="font-mono text-3xl font-bold tracking-tight">
                    <span className="sr-only">QR code for table </span>
                    {tableName}
                </span>
            }
            description={restaurantName}
            footer={
                <>
                    <a
                        href={dataUrl ?? undefined}
                        download={fileName}
                        aria-disabled={!dataUrl}
                        className="inline-flex items-center justify-center gap-2 rounded-[var(--r-chip)] border border-[var(--line)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--card)]"
                    >
                        <Download size={16} aria-hidden /> Download PNG
                    </a>
                    <Button
                        variant="solid"
                        icon={<Printer size={16} aria-hidden />}
                        onClick={() => printQrCards([{ restaurantName, tableName, url }])}
                    >
                        Print
                    </Button>
                </>
            }
        >
            <div className="flex aspect-square items-center justify-center rounded-[var(--r-card)] border border-[var(--line)] bg-white p-3">
                {dataUrl && (
                    <img src={dataUrl} alt={`QR code for table ${tableName}`} className="h-full w-full [image-rendering:pixelated]" />
                )}
                {!dataUrl && !failed && <p className="text-sm text-[var(--muted)]">Making the code…</p>}
                {failed && <p className="text-sm text-[var(--bad)]">Could not make the QR code. Please try again.</p>}
            </div>
            <p className="mt-4 break-all text-center font-mono text-xs text-[var(--muted)]">{url}</p>
        </Modal>
    );
}
