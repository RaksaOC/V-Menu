function SkeletonSettingsTableCard() {
    return (
        <div className="p-2 flex justify-center w-full min-w-[300px] max-w-[400px]">
            <div className="min-h-[250px] w-full p-4 rounded-lg border border-zinc-300 bg-zinc-100 dark:bg-zinc-800 animate-pulse flex flex-col justify-between">
                <div className="text-center">
                    <div className="h-6 w-1/2 bg-zinc-300 dark:bg-zinc-600 mx-auto rounded" />
                </div>

                <div className="mt-4 space-y-2">
                    <div className="w-full h-10 bg-zinc-300 dark:bg-zinc-700 rounded-lg" />
                    <div className="w-full h-10 bg-zinc-300 dark:bg-zinc-700 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export default SkeletonSettingsTableCard;
