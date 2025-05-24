function SkeletonMenuCard({ isLight = false }: { isLight?: boolean }) {
    const baseCardClasses = `max-w-xs w-full rounded-2xl overflow-hidden shadow-lg animate-pulse m-2`;
    const cardBg = isLight ? 'bg-white' : 'bg-zinc-900';
    const barBg = isLight ? 'bg-gray-200' : 'bg-zinc-700';

    return (
        <div className={`${baseCardClasses} ${cardBg}`}>
            <div className={`w-full h-48 ${barBg}`} />
            <div className="p-4 space-y-4">
                <div className={`h-6 rounded w-3/4 ${barBg}`} />
                <div className={`h-4 rounded w-1/2 ${barBg}`} />
                <div className={`h-10 rounded w-full ${barBg}`} />
            </div>
        </div>
    );
}

export default SkeletonMenuCard;
