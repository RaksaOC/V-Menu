"use client";

import { useState } from "react";
import { CheckCircle, Pencil, QrCode, Table as TableIcon, XCircle } from "lucide-react";
import { Button, Card, Chip } from "@/components/ui";
import TableQrModal from "@/components/qr/TableQrModal";
import { useRestaurantSlug } from "@/features/restaurant/use-restaurant-slug";
import type { Table } from "@vmenu/contracts";

type Props = { table: Table; restaurantName?: string } & (
    { role: "owner"; onEdit: (table: Table) => void } | { role: "cashier"; onToggle: (table: Table) => void }
);

/** One table, for the owner (edit) and the cashier (open/close); both can show its QR code (CL-09). */
export default function TableCard(props: Props) {
    const { table } = props;
    const slug = useRestaurantSlug();
    const [showQr, setShowQr] = useState(false);
    return (
        <Card className="relative flex flex-col items-center gap-4 text-center">
            <span
                aria-hidden
                className={`absolute right-4 top-4 h-2.5 w-2.5 rounded-full ${table.isEnabled ? "bg-[var(--ok)]" : "bg-[var(--bad)]"}`}
            />
            <div
                className={`rounded-[var(--r-card)] p-3 ${table.isEnabled ? "bg-[var(--ok-soft)] text-[var(--ok)]" : "bg-[var(--bad-soft)] text-[var(--bad)]"}`}
            >
                <TableIcon size={26} aria-hidden />
            </div>
            <h3 className="text-lg font-semibold">Table {table.name}</h3>
            <Chip tone={table.isEnabled ? "ok" : "bad"}>
                {table.isEnabled ? <CheckCircle size={12} aria-hidden /> : <XCircle size={12} aria-hidden />}
                {table.isEnabled ? "Available" : "Closed"}
            </Chip>
            <div className="mt-2 grid w-full gap-2">
                {props.role === "cashier" ? (
                    <Button
                        variant={table.isEnabled ? "danger" : "solid"}
                        icon={table.isEnabled ? <XCircle size={16} aria-hidden /> : <CheckCircle size={16} aria-hidden />}
                        onClick={() => props.onToggle(table)}
                        block
                    >
                        {table.isEnabled ? "Close Table" : "Open Table"}
                    </Button>
                ) : (
                    <Button variant="outline" icon={<Pencil size={16} aria-hidden />} onClick={() => props.onEdit(table)} block>
                        Edit Table
                    </Button>
                )}
                <Button icon={<QrCode size={16} aria-hidden />} onClick={() => setShowQr(true)} block>
                    View QR Code
                </Button>
            </div>
            {showQr && (
                <TableQrModal
                    slug={slug}
                    tableName={table.name}
                    qrToken={table.qrToken}
                    restaurantName={props.restaurantName}
                    onClose={() => setShowQr(false)}
                />
            )}
        </Card>
    );
}
