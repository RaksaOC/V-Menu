import { DISH_TAGS } from "../item-rules";

/** The dish's tags as checkboxes (VM-26). */
export default function TagsField({
    tags,
    setTags,
    error,
}: {
    tags: string[];
    setTags: (update: (all: string[]) => string[]) => void;
    error?: string;
}) {
    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-[var(--ink)]">Tags</legend>
            <div className="flex flex-wrap gap-2">
                {DISH_TAGS.map((tag) => (
                    <label
                        key={tag}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-chip)] border border-[var(--line)] px-3 text-sm has-[:checked]:border-[var(--ink)] has-[:checked]:bg-[var(--card)]"
                    >
                        <input
                            type="checkbox"
                            checked={tags.includes(tag)}
                            onChange={(e) => setTags((all) => (e.target.checked ? [...all, tag] : all.filter((t) => t !== tag)))}
                        />
                        {tag}
                    </label>
                ))}
            </div>
            {error && <p className="text-xs text-[var(--bad)]">{error}</p>}
        </fieldset>
    );
}
