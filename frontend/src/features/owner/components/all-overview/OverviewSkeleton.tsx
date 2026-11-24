/** The owner's overview while it loads: eight cards and two charts. */
export function OverviewSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--bg)]">
            <div className="w-full mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-[var(--bg)] rounded-3xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="w-16 h-16 bg-[var(--surface-2)] rounded-2xl"></div>
                                <div className="w-16 h-4 bg-[var(--surface-2)] rounded"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="w-24 h-4 bg-[var(--surface-2)] rounded"></div>
                                <div className="w-16 h-8 bg-[var(--surface-2)] rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[var(--bg)] rounded-3xl p-6">
                        <div className="w-full h-64 bg-[var(--surface-2)] rounded-2xl"></div>
                    </div>
                    <div className="bg-[var(--bg)] rounded-3xl p-6">
                        <div className="w-full h-64 bg-[var(--surface-2)] rounded-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
