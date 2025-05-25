function SkeletonMenuCard({isLight = false}: { isLight?: boolean }) {
    const baseCardClasses = `max-w-xs w-full rounded-2xl overflow-hidden shadow-lg animate-pulse m-2`;
    const cardBg = isLight ? 'bg-white' : 'bg-zinc-900';
    const barBg = isLight ? 'bg-gray-200' : 'bg-zinc-700';

    return (
        // <div className={`${baseCardClasses} ${cardBg}`}>
        //     <div className={`w-full h-48 ${barBg}`} />
        //     <div className="p-4 space-y-4">
        //         <div className={`h-6 rounded w-3/4 ${barBg}`} />
        //         <div className={`h-4 rounded w-1/2 ${barBg}`} />
        //         <div className={`h-10 rounded w-full ${barBg}`} />
        //     </div>
        // </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({length: 8}).map((_, index) => (
                <div key={index} className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-4 animate-pulse">
                    <div className="w-full h-44 bg-slate-200 dark:bg-slate-600 rounded-xl mb-4"></div>
                    <div className="space-y-3">
                        <div className="h-5 bg-slate-200 dark:bg-slate-600 rounded-lg w-3/4"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded-lg w-1/2"></div>
                        <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded-xl"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default SkeletonMenuCard;
