/** The owner's overview while it loads: eight cards and two charts. */
export function OverviewSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="w-full mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-3xl p-6 shadow-lg animate-pulse">
                            <div className="flex justify-between items-center mb-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-2xl"></div>
                                <div className="w-16 h-4 bg-gray-200 rounded"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                                <div className="w-16 h-8 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-6 shadow-lg animate-pulse">
                        <div className="w-full h-64 bg-gray-200 rounded-2xl"></div>
                    </div>
                    <div className="bg-white rounded-3xl p-6 shadow-lg animate-pulse">
                        <div className="w-full h-64 bg-gray-200 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
