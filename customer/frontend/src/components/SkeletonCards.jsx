function SkeletonCards() {
    return (
        <>
            <div className="max-w-[100%] rounded-2xl overflow-hidden shadow-lg bg-white animate-pulse">
                <div className="w-full h-48 bg-gray-300"/>
                <div className="p-4 space-y-4">
                    <div className="h-6 bg-gray-300 rounded w-3/4"/>
                    <div className="h-4 bg-gray-300 rounded w-1/2"/>
                    <div className="h-10 bg-gray-300 rounded w-full"/>
                </div>
            </div>
            <div className="max-w-[100%] rounded-2xl overflow-hidden shadow-lg bg-white animate-pulse">
                <div className="w-full h-48 bg-gray-300"/>
                <div className="p-4 space-y-4">
                    <div className="h-6 bg-gray-300 rounded w-3/4"/>
                    <div className="h-4 bg-gray-300 rounded w-1/2"/>
                    <div className="h-10 bg-gray-300 rounded w-full"/>
                </div>
            </div>
            <div className="max-w-[100%] rounded-2xl overflow-hidden shadow-lg bg-white animate-pulse">
                <div className="w-full h-48 bg-gray-300"/>
                <div className="p-4 space-y-4">
                    <div className="h-6 bg-gray-300 rounded w-3/4"/>
                    <div className="h-4 bg-gray-300 rounded w-1/2"/>
                    <div className="h-10 bg-gray-300 rounded w-full"/>
                </div>
            </div>
        </>
    );
}

export default SkeletonCards;