import { Search } from "lucide-react";
import type { MenuSection } from "@vmenu/contracts";
import { sectionId } from "@/features/customer/menu";

/** VM-25: the search box and the category tabs, sticky under the header. VM-33: the tabs are a
 *  mono row that scrolls sideways, the open one underlined in coral. */
export default function MenuToolbar({
    query,
    onQuery,
    shown,
    current,
    goTo,
}: {
    query: string;
    onQuery: (query: string) => void;
    shown: MenuSection[];
    current: string | null;
    goTo: (section: MenuSection) => void;
}) {
    return (
        <div className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)] px-4 sm:px-6">
            <div className="mx-auto max-w-6xl pt-3">
                <label className="relative block">
                    <Search
                        size={16}
                        aria-hidden
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    />
                    <input
                        type="search"
                        aria-label="Search dishes"
                        placeholder="Search dishes"
                        value={query}
                        onChange={(e) => onQuery(e.target.value)}
                        className="min-h-11 w-full rounded-[var(--r-in)] border border-[var(--line)] bg-[var(--bg)] py-2.5 pl-9 pr-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-mid)]"
                    />
                </label>
                {shown.length > 1 ? (
                    <nav aria-label="Menu categories" className="-mx-1 mt-1 flex gap-1 overflow-x-auto px-1">
                        {shown.map((section) => {
                            const active = current === sectionId(section);
                            return (
                                <button
                                    key={sectionId(section)}
                                    type="button"
                                    aria-current={active ? "true" : undefined}
                                    onClick={() => goTo(section)}
                                    className={`min-h-11 shrink-0 border-b-2 px-3 font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] transition-colors ${
                                        active
                                            ? "border-[var(--accent)] text-[var(--ink)]"
                                            : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
                                    }`}
                                >
                                    {section.name}
                                </button>
                            );
                        })}
                    </nav>
                ) : (
                    <div className="h-3" />
                )}
            </div>
        </div>
    );
}
