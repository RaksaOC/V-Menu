export type SkeletonVariant = "menu" | "order" | "overview" | "table";

const bar = "rounded bg-[var(--line)]";
const SHAPES: Record<SkeletonVariant, () => React.ReactNode> = {
    menu: () => (
        <>
            <div className={`h-40 w-full ${bar}`} />
            <div className="space-y-2 p-4">
                <div className={`h-4 w-2/3 ${bar}`} />
                <div className={`h-6 w-1/3 ${bar}`} />
            </div>
        </>
    ),
    order: () => (
        <div className="space-y-3 p-5">
            <div className={`h-5 w-1/3 ${bar}`} />
            <div className={`h-4 w-1/2 ${bar}`} />
            <div className={`h-12 w-full ${bar}`} />
            <div className={`h-10 w-full ${bar}`} />
        </div>
    ),
    overview: () => (
        <div className="flex items-center justify-between p-5">
            <div className="space-y-3">
                <div className={`h-4 w-24 ${bar}`} />
                <div className={`h-8 w-16 ${bar}`} />
            </div>
            <div className={`h-12 w-12 ${bar}`} />
        </div>
    ),
    table: () => (
        <div className="flex flex-col items-center gap-3 p-6">
            <div className={`h-16 w-16 ${bar}`} />
            <div className={`h-5 w-24 ${bar}`} />
            <div className={`h-5 w-20 ${bar}`} />
            <div className={`h-10 w-full ${bar}`} />
        </div>
    ),
};
const GRIDS: Record<SkeletonVariant, string> = {
    menu: "grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4",
    order: "grid gap-6",
    overview: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
    table: "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

/**
 * Loading placeholders; one component instead of four Skeleton*Card files (CL-09).
 * Static on purpose: the Deep Lab rules (section 3) allow no continuous pulse.
 */
export default function Skeleton({ variant, count = 3, className }: { variant: SkeletonVariant; count?: number; className?: string }) {
    const Shape = SHAPES[variant];
    return (
        <div role="status" aria-label="Loading" aria-busy="true" className={`w-full ${className ?? GRIDS[variant]}`}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} data-skeleton className="overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--bg)]">
                    <Shape />
                </div>
            ))}
        </div>
    );
}
