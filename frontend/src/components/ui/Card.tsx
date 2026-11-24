import type { ElementType, HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
    as?: ElementType;
    /** false for edge-to-edge content such as a photo on top */
    padded?: boolean;
}

/** A surface on the page background: line border, card radius (CL-09). */
export default function Card({ as: Tag = "div", padded = true, className = "", ...rest }: CardProps) {
    return (
        <Tag
            className={`rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] ${padded ? "p-5" : ""} ${className}`}
            {...rest}
        />
    );
}
