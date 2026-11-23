import type { HTMLAttributes } from "react";

export type ChipTone = "ok" | "bad" | "accent" | "neutral";
const TONES: Record<ChipTone, string> = {
    ok: "bg-[var(--ok-soft)] text-[var(--ok)]",
    bad: "bg-[var(--bad-soft)] text-[var(--bad)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-text)]",
    neutral: "bg-[var(--card)] text-[var(--muted)]",
};

/** A small status label (CL-09). */
export default function Chip({ tone = "neutral", className = "", ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: ChipTone }) {
    return <span data-tone={tone} className={`inline-flex items-center gap-1 rounded-[var(--r-chip)] px-2.5 py-1 text-xs font-medium ${TONES[tone]} ${className}`} {...rest} />;
}
