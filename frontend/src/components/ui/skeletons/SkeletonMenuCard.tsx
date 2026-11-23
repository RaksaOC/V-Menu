function SkeletonMenuCard({isLight = false}: { isLight?: boolean }) {
    const baseCardBg = isLight ? 'bg-slate-100' : 'bg-slate-700';
    const placeholderBg = isLight ? 'bg-slate-200' : 'bg-slate-600';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {Array.from({length: 8}).map((_, index) => (
                <div key={index} className={`${baseCardBg} rounded-2xl p-4 animate-pulse`}>
                    <div className={`w-full h-44 rounded-xl mb-4`}></div>
                    <div className="space-y-3">
                        <div className={`h-5 ${placeholderBg} rounded-lg w-3/4`}></div>
                        <div className={`h-4 ${placeholderBg} rounded-lg w-1/2`}></div>
                        <div className={`h-8 ${placeholderBg} rounded-xl`}></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default SkeletonMenuCard;
