import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import type { Category } from "@vmenu/contracts";

const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-[var(--r-chip)] border border-[var(--line)] text-[var(--ink)] transition hover:bg-[var(--card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40";

/** A category's name with Move up, Move down, Rename and Delete (VM-25). */
export default function CategoryActions({
    category,
    isFirst,
    isLast,
    busy,
    onMove,
    onRename,
    onDelete,
}: {
    category: Category;
    isFirst: boolean;
    isLast: boolean;
    busy: boolean;
    onMove: (by: -1 | 1) => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    return (
        <>
            <span className="mr-auto min-w-0 truncate font-medium text-[var(--ink)]">{category.name}</span>
            <button
                type="button"
                className={iconButton}
                aria-label={`Move ${category.name} up`}
                disabled={busy || isFirst}
                onClick={() => onMove(-1)}
            >
                <ArrowUp size={16} aria-hidden />
            </button>
            <button
                type="button"
                className={iconButton}
                aria-label={`Move ${category.name} down`}
                disabled={busy || isLast}
                onClick={() => onMove(1)}
            >
                <ArrowDown size={16} aria-hidden />
            </button>
            <button type="button" className={iconButton} aria-label={`Rename ${category.name}`} onClick={onRename}>
                <Pencil size={16} aria-hidden />
            </button>
            <button type="button" className={`${iconButton} text-[var(--bad)]`} aria-label={`Delete ${category.name}`} onClick={onDelete}>
                <Trash2 size={16} aria-hidden />
            </button>
        </>
    );
}
