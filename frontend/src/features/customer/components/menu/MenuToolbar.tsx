import { Search } from "lucide-react";
import type { MenuSection } from "@vmenu/contracts";
import { sectionId } from "@/features/customer/menu";

/** VM-25: the search box and the category tabs, sticky under the header. */
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
        <div className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/90 backdrop-blur-lg">
            <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 sm:px-6">
                <label className="relative block">
                    <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        aria-label="Search dishes"
                        placeholder="Search dishes"
                        value={query}
                        onChange={(e) => onQuery(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                    />
                </label>
                {shown.length > 1 && (
                    <nav aria-label="Menu categories" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                        {shown.map((section) => {
                            const active = current === sectionId(section);
                            return (
                                <button
                                    key={sectionId(section)}
                                    type="button"
                                    aria-current={active ? "true" : undefined}
                                    onClick={() => goTo(section)}
                                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                        active ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                    }`}
                                >
                                    {section.name}
                                </button>
                            );
                        })}
                    </nav>
                )}
            </div>
        </div>
    );
}
