/** VM-26: a dish's tags as small mono labels (vegetarian, spicy, contains nuts). */
export default function DishTags({ tags, className = "" }: { tags?: string[]; className?: string }) {
    if (!tags?.length) return null;
    return (
        <ul aria-label="Dish tags" className={`flex flex-wrap gap-1 ${className}`}>
            {tags.map((tag) => (
                <li
                    key={tag}
                    className="rounded-[var(--r-chip)] border border-[var(--line)] px-1.5 py-0.5 font-[family-name:var(--f-label)] text-[10px] uppercase leading-4 tracking-[var(--label-track)] text-[var(--muted)]"
                >
                    {tag}
                </li>
            ))}
        </ul>
    );
}
