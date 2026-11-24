import React from "react";

// One figure on the owner's overview (VM-35): a large mono figure under a mono uppercase label.
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
    subtitle?: string;
    /** shown with a coral edge and "Needs attention" */
    isUrgent?: boolean;
}

export const StatCard = ({ title, value, icon: Icon, subtitle, isUrgent = false }: StatCardProps) => (
    <div
        className={`relative rounded-[var(--r-card)] border bg-[var(--card)] p-5 ${isUrgent ? "border-[var(--accent)]" : "border-[var(--line)]"}`}
    >
        <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="font-[family-name:var(--f-mono)] text-xs font-semibold uppercase tracking-[var(--label-track)] text-[var(--muted)]">
                {title}
            </h3>
            <Icon size={20} aria-hidden className="shrink-0 text-[var(--muted)]" />
        </div>
        <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-[family-name:var(--f-mono)] text-3xl font-semibold text-[var(--ink)]">
                {typeof value === "number" ? value.toLocaleString("en-US") : value}
            </span>
            {subtitle && <span className="text-sm text-[var(--muted)]">{subtitle}</span>}
            {isUrgent && <span className="text-xs font-semibold text-[var(--accent-text)]">Needs attention</span>}
        </div>
    </div>
);
