/** The staff page while it loads: header, stat cards, filters and a table. */
export default function StaffSkeleton() {
    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-6 sm:h-8 w-40 bg-[var(--surface-2)] rounded"></div>
                    <div className="h-4 w-60 bg-[var(--surface-2)] rounded"></div>
                </div>
                <div className="h-10 w-32 bg-[var(--surface-2)] rounded-lg"></div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-[var(--bg)] border border-[var(--line)] rounded-xl p-3 sm:p-4 space-y-2">
                        <div className="h-4 w-10 bg-[var(--surface-2)] rounded"></div>
                        <div className="h-6 w-16 bg-[var(--surface-2)] rounded"></div>
                    </div>
                ))}
            </div>

            <div className="bg-[var(--bg)] rounded-xl border border-[var(--line)] p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="h-10 bg-[var(--surface-2)] rounded w-full"></div>
                    <div className="h-10 bg-[var(--surface-2)] rounded w-full sm:w-40"></div>
                </div>
            </div>

            <div className="hidden lg:block bg-[var(--bg)] rounded-xl border border-[var(--line)]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[var(--card)] border-b border-[var(--line)]">
                            <tr>
                                {[...Array(5)].map((_, i) => (
                                    <th key={i} className="py-4 px-2">
                                        <div className="h-4 w-20 bg-[var(--surface-2)] rounded mx-auto"></div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--line)]">
                            {[...Array(4)].map((_, i) => (
                                <tr key={i} className="hover:bg-[var(--card)] transition-colors">
                                    {[...Array(5)].map((_, j) => (
                                        <td key={j} className="py-4 px-2 text-center">
                                            <div className="h-4 w-24 bg-[var(--surface-2)] rounded mx-auto"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
