import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

const inputVariants = {
    focus: { scale: 1.02, boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)" },
    blur: { scale: 1, boxShadow: "none" },
};

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
    return (
        <div className="flex flex-col gap-2 relative z-10">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {label}
            </label>
            <motion.input
                type={type}
                value={value}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(e) => onChange(e.target.value)}
                className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-white focus:outline-none"
                required
                whileFocus="focus"
                whileTap="focus"
                variants={inputVariants}
            />
            {children}
        </div>
    );
}
