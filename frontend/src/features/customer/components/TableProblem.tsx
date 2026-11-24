import { AlertTriangle, DoorClosed, RotateCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui";

export type TableProblemKind = "closed" | "no-restaurant" | "no-table" | "invalid-link" | "error";

const COPY: Record<TableProblemKind, { title: (table: string) => string; body: string }> = {
    closed: {
        title: (t) => `Table ${t} isn't open yet`,
        body: "Please ask a staff member to open it. The menu will be here once they do.",
    },
    "no-restaurant": {
        title: () => "We couldn't find this restaurant",
        body: "The link may be mistyped or out of date. Please ask a staff member for help.",
    },
    "no-table": {
        title: (t) => `We couldn't find table ${t}`,
        body: "This table may have been renamed or removed. Please ask a staff member for help.",
    },
    // SEC-04: a wrong, old or reset link. The same words whatever the reason.
    "invalid-link": {
        title: () => "This table link isn't valid",
        body: "Please scan the QR code on your table again. If it still doesn't work, ask a staff member.",
    },
    error: { title: () => "Something went wrong", body: "We couldn't load the menu. Please check your connection and try again." },
};

/** What the customer sees instead of the menu when the table can't be used (VM-04), in the menu's style (VM-33). */
export default function TableProblem({ kind, table, onRetry }: { kind: TableProblemKind; table: string; onRetry: () => void }) {
    const { title, body } = COPY[kind];
    const Icon = kind === "closed" ? DoorClosed : kind === "error" ? AlertTriangle : SearchX;
    return (
        <div className="col-span-full flex justify-center py-12" role={kind === "error" ? "alert" : "status"}>
            <div className="max-w-md rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-6 text-center">
                <div
                    className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--r-card)] ${kind === "error" ? "bg-[var(--bad-soft)] text-[var(--bad)]" : "bg-[var(--surface-2)] text-[var(--muted)]"}`}
                >
                    <Icon size={28} aria-hidden />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-[var(--ink)]">{title(table)}</h2>
                <p className="text-[var(--muted)]">{body}</p>
                {kind === "error" && (
                    <Button variant="solid" className="mt-6 min-h-11" icon={<RotateCw size={18} aria-hidden />} onClick={onRetry}>
                        Try again
                    </Button>
                )}
            </div>
        </div>
    );
}
