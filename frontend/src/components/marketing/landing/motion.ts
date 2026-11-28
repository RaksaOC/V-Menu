// Shared framer-motion settings for the landing page.

export const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Lifts into place and comes into focus when scrolled into view. Text never fades, so it keeps
 * full contrast at every frame (the accessibility check can catch any frame).
 */
export const reveal = {
    hidden: { y: 28, filter: "blur(10px)" },
    visible: { y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease }, transitionEnd: { filter: "none" } },
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
