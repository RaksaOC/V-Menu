// Shared framer-motion settings for the landing page.

export const ease = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts into place when scrolled into view. */
export const reveal = {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

/** Reveals its children one after another. */
export const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09 } },
};

/** Spread onto a motion element so it reveals once, a little before it is fully in view. */
export const inView = {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-80px" },
} as const;
