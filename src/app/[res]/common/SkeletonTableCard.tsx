function SkeletonTableCard() {
    return (
        // <div className="p-2 flex justify-center w-full min-w-[300px] max-w-[400px]">
        //     <div className="min-h-[250px] w-full p-4 rounded-lg border border-zinc-300 bg-zinc-100 dark:bg-zinc-800 animate-pulse flex flex-col justify-between">
        //         <div className="space-y-2">
        //             <div className="h-6 bg-gray-300 rounded w-3/4 mx-auto" />
        //             <div className="h-4 bg-gray-400 rounded w-1/2 mx-auto" />
        //         </div>
        //
        //         <div className="mt-4 space-y-2">
        //             <div className="h-10 bg-gray-300 rounded w-full" />
        //             <div className="h-10 bg-gray-300 rounded w-full" />
        //         </div>
        //     </div>
        // </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({length: 6}).map((_, index) => (
                <div key={index} className="bg-slate-100 dark:bg-slate-700 rounded-2xl p-6 animate-pulse">
                    <div className="space-y-4">
                        <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded-lg w-3/4 mx-auto"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded-lg w-1/2 mx-auto"></div>
                        <div className="space-y-2 mt-6">
                            <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded-xl"></div>
                            <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default SkeletonTableCard;
