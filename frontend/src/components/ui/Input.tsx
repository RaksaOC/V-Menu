import { forwardRef, useId, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
}

/** The one field style for inputs, selects and text areas (VM-35); add the border colour. */
export const FIELD =
    "w-full rounded-[var(--r-in)] border bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60";

/** A labelled field; its error is linked to it for screen readers (CL-09). */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, id, className = "", ...rest }, ref) {
    const auto = useId();
    const fieldId = id ?? auto;
    const noteId = `${fieldId}-note`;
    const note = error ?? hint;
    return (
        <div className="space-y-1.5">
            <label htmlFor={fieldId} className="block text-sm font-semibold text-[var(--ink)]">
                {label}
            </label>
            <input
                ref={ref}
                id={fieldId}
                aria-invalid={error ? true : undefined}
                aria-describedby={note ? noteId : undefined}
                className={`${FIELD} ${error ? "border-[var(--bad)]" : "border-[var(--line)]"} ${className}`}
                {...rest}
            />
            {note && (
                <p id={noteId} className={`text-xs ${error ? "text-[var(--bad)]" : "text-[var(--muted)]"}`}>
                    {note}
                </p>
            )}
        </div>
    );
});
export default Input;
