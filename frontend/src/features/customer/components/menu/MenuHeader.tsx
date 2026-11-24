import { ThemeToggle } from "@/components/marketing/tour/ThemeToggle";
import TableRequests from "@/features/customer/components/TableRequests";
import type { TableLink } from "@/features/customer/table-link";

/** The menu's header (VM-33): a solid forest band with the restaurant's name (VM-21), a mono chip
 *  with the table, the table's requests (VM-30), and the light/dark switch. */
export default function MenuHeader({
    heading,
    nameLoaded,
    table,
    link,
}: {
    heading: string;
    nameLoaded: boolean;
    table: string;
    link: TableLink;
}) {
    return (
        <header className="vm-band px-4 pb-6 pt-5 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1
                            className={`break-words font-[family-name:var(--f-display)] text-3xl font-semibold tracking-[var(--d-track)] sm:text-4xl ${nameLoaded ? "" : "invisible"}`}
                        >
                            {heading}
                        </h1>
                        <p
                            className={`mt-3 inline-block rounded-[var(--r-chip)] border border-white/30 px-2.5 py-1 font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] ${table ? "" : "invisible"}`}
                        >
                            Table {table}
                        </p>
                    </div>
                    <ThemeToggle className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--r-chip)] border border-white/30 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]" />
                </div>
                {/* VM-30: once the table has ordered */}
                <TableRequests link={link} />
            </div>
        </header>
    );
}
