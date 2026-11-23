import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "solid" | "outline" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-95",
    solid: "bg-[var(--btn-bg)] text-[var(--btn-ink)] hover:opacity-90",
    outline: "border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[var(--card)]",
    // An outline on the soft red reads in light and dark; white text on dark mode's light red didn't.
    danger: "border border-[var(--bad)] bg-[var(--bad-soft)] text-[var(--bad)] hover:bg-[var(--bad)] hover:text-[var(--bg)]",
};
// Both sizes keep the 44 x 44 px touch target (section 3); "sm" only has less padding.
const SIZES = { sm: "min-h-11 min-w-11 px-3 py-1.5 text-sm", md: "min-h-11 min-w-11 px-4 py-2.5 text-sm" };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** primary = coral, solid = ink, outline = line, danger = red outline (Deep Lab, section 3). */
    variant?: ButtonVariant;
    size?: keyof typeof SIZES;
    icon?: ReactNode;
    loading?: boolean;
    block?: boolean;
}

/** The one button (CL-09). Defaults to type="button", so it never submits a form by accident. */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = "primary", size = "md", icon, loading = false, block = false, disabled, className = "", type = "button", children, ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            data-variant={variant}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-[var(--r-chip)] font-semibold motion-safe:transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${block ? "w-full" : ""} ${className}`}
            {...rest}
        >
            {loading ? <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    );
});
export default Button;
