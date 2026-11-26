import { useId, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { FIELD } from "@/components/ui";

const AUTOCOMPLETE = { text: "on", email: "email", password: "new-password" } as const;

/** One labelled field on the sign-up form. `children` goes under the input (a hint or an error). */
export default function SignupField({
    label,
    icon: Icon,
    type,
    value,
    onChange,
    error,
    errorId,
    children,
}: {
    label: string;
    icon: LucideIcon;
    type: "text" | "email" | "password";
    value: string;
    onChange: (value: string) => void;
    error?: string;
    errorId?: string;
    children?: ReactNode;
}) {
    const id = useId(); // VM-36: the label names the field
    return (
        <div className="flex flex-col gap-2 relative z-10">
            <label htmlFor={id} className="text-sm font-medium text-[var(--ink)] flex items-center gap-2">
                <Icon className="w-4 h-4" aria-hidden />
                {label}
            </label>
            <input
                id={id}
                type={type}
                autoComplete={AUTOCOMPLETE[type]}
                value={value}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(e) => onChange(e.target.value)}
                className={`${FIELD} ${error ? "border-[var(--bad)]" : "border-[var(--line)]"}`}
                required
            />
            {children}
        </div>
    );
}
