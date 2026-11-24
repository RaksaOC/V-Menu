import { AlertTriangle, DoorClosed, RotateCw, SearchX } from "lucide-react";

export type TableProblemKind = "closed" | "no-restaurant" | "no-table" | "error";

const COPY: Record<TableProblemKind, { title: (table: string) => string; body: string }> = {
    closed: { title: (t) => `Table ${t} isn't open yet`, body: "Please ask a staff member to open it. The menu will be here once they do." },
    "no-restaurant": { title: () => "We couldn't find this restaurant", body: "The link may be mistyped or out of date. Please ask a staff member for help." },
    "no-table": { title: (t) => `We couldn't find table ${t}`, body: "This table may have been renamed or removed. Please ask a staff member for help." },
    error: { title: () => "Something went wrong", body: "We couldn't load the menu. Please check your connection and try again." },
};

/** What the customer sees instead of the menu when the table can't be used (VM-04). */
export default function TableProblem({ kind, table, onRetry }: { kind: TableProblemKind; table: string; onRetry: () => void }) {
    const { title, body } = COPY[kind];
    const Icon = kind === "closed" ? DoorClosed : kind === "error" ? AlertTriangle : SearchX;
    return (
        <div className="col-span-full flex justify-center py-12" role={kind === "error" ? "alert" : "status"}>
            <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                    <Icon size={32} className={kind === "error" ? "text-red-500" : "text-gray-500"} />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-gray-800">{title(table)}</h2>
                <p className="text-gray-600">{body}</p>
                {kind === "error" && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
                    >
                        <RotateCw size={18} /> Try again
                    </button>
                )}
            </div>
        </div>
    );
}
