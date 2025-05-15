function SkeletonOrderCard() {
    return (
        <div className="rounded-2xl overflow-hidden shadow-lg bg-white dark:bg-zinc-800 animate-pulse p-4 space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div className="h-6 bg-gray-300 dark:bg-zinc-600 rounded w-1/3" />
                {/* Optional Order ID placeholder */}
                {/* <div className="h-4 bg-gray-300 dark:bg-zinc-600 rounded w-1/4" /> */}
            </div>

            {/* Items List */}
            <div className="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 space-y-4">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-2 border-b border-zinc-300 dark:border-zinc-600 pb-2">
                        <div className="h-4 bg-gray-300 dark:bg-zinc-600 rounded w-1/4 mb-2" />
                        {[...Array(2)].map((_, j) => (
                            <div key={j} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-300 dark:bg-zinc-600 rounded" />
                                    <div className="space-y-1">
                                        <div className="h-4 bg-gray-300 dark:bg-zinc-600 rounded w-24" />
                                        <div className="h-3 bg-gray-300 dark:bg-zinc-600 rounded w-16" />
                                    </div>
                                </div>
                                <div className="h-4 bg-gray-300 dark:bg-zinc-600 rounded w-12" />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 flex-col sm:flex-row">
                <div className="w-full h-10 bg-gray-300 dark:bg-zinc-600 rounded-xl" />
                <div className="w-full h-10 bg-gray-300 dark:bg-zinc-600 rounded-xl" />
            </div>
        </div>
    );
}

export default SkeletonOrderCard;
