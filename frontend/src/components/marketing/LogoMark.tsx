import { useId } from "react";

/**
 * The V-Menu mark: a coral V that doubles as a tick ("order done") inside a scanner's corners
 * ("scan the table"). Same drawing as public/logo.svg and the favicons.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
    const id = useId();
    return (
        <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
            <defs>
                <linearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ff9a80" />
                    <stop offset="1" stopColor="#ff6545" />
                </linearGradient>
                <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#2a2a33" />
                    <stop offset="1" stopColor="#121216" />
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="18" fill={`url(#${id}t)`} />
            <path
                d="M11 19.5V15a4 4 0 0 1 4-4h4.5M53 44.5V49a4 4 0 0 1-4 4h-4.5"
                fill="none"
                stroke="#ffffff"
                strokeOpacity=".42"
                strokeWidth="3"
                strokeLinecap="round"
            />
            <path
                d="M17 26 29.5 45 47.5 17"
                fill="none"
                stroke={`url(#${id}v)`}
                strokeWidth="7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
