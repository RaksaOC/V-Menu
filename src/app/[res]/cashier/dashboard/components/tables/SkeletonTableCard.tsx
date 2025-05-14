function SkeletonTableCard() {
    return (
        <div className="p-2 flex justify-center w-full min-w-[300px] max-w-[400px]">
            <div className="min-h-[250px] w-full p-4 rounded-lg border border-zinc-300 bg-zinc-100 dark:bg-zinc-800 animate-pulse flex flex-col justify-between">
                <div className="space-y-2">
                    <div className="h-6 bg-gray-300 rounded w-3/4 mx-auto" />
                    <div className="h-4 bg-gray-400 rounded w-1/2 mx-auto" />
                </div>

                <div className="mt-4 space-y-2">
                    <div className="h-10 bg-gray-300 rounded w-full" />
                    <div className="h-10 bg-gray-300 rounded w-full" />
                </div>
            </div>
        </div>
    );
}

export default SkeletonTableCard;
