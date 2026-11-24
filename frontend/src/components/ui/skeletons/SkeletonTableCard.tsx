function SkeletonTableCard({ isLight }: { isLight?: boolean }) {
    const cardBg = isLight ? "bg-slate-100" : "bg-slate-700";
    const barBg = isLight ? "bg-slate-200" : "bg-slate-600";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {Array.from({ length: 6 }).map((_, index) => (
                <div
                    key={index}
                    className={`rounded-2xl p-6 animate-pulse ${cardBg}`}
                >
                    <div className="space-y-4">
                        <div className={`h-6 rounded-lg w-3/4 mx-auto ${barBg}`} />
                        <div className={`h-4 rounded-lg w-1/2 mx-auto ${barBg}`} />
                        <div className="space-y-2 mt-6">
                            <div className={`h-10 rounded-xl ${barBg}`} />
                            <div className={`h-10 rounded-xl ${barBg}`} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default SkeletonTableCard;
