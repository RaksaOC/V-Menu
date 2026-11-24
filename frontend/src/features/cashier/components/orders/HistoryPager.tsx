import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaidBillsPage } from "@/features/cashier/api";

/** Previous / Next under the paid bills. */
export default function HistoryPager({
    history,
    historyPage,
    setHistoryPage,
}: {
    history: PaidBillsPage;
    historyPage: number;
    setHistoryPage: (update: (page: number) => number) => void;
}) {
    return (
        <nav aria-label="History pages" className="flex w-full items-center justify-between gap-4 px-4 pb-6 text-[var(--body)]">
            <button
                type="button"
                onClick={() => setHistoryPage((p) => p - 1)}
                disabled={historyPage <= 1}
                className="flex items-center gap-1 rounded-xl border border-[var(--line)] px-4 py-2 font-medium disabled:opacity-40"
            >
                <ChevronLeft size={18} aria-hidden /> Previous
            </button>
            <p className="text-sm">
                Page {history.page} of {history.pages}
                <span className="block text-[var(--muted)]">{history.total} paid bills</span>
            </p>
            <button
                type="button"
                onClick={() => setHistoryPage((p) => p + 1)}
                disabled={historyPage >= history.pages}
                className="flex items-center gap-1 rounded-xl border border-[var(--line)] px-4 py-2 font-medium disabled:opacity-40"
            >
                Next <ChevronRight size={18} aria-hidden />
            </button>
        </nav>
    );
}
