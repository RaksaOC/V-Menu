import type { ElementType, HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLElement> {
    as?: ElementType;
}

/** A surface on the page background: line border, card radius (CL-09). */
export default function Card({ as: Tag = "div", className = "", ...rest }: CardProps) {
    return <Tag className={`rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--bg)] p-5 text-[var(--ink)] ${className}`} {...rest} />;
}
