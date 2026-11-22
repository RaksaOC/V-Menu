import localFont from "next/font/local";

/* Self-hosted at build time from the @fontsource-variable packages (variable weight, Latin).
   next/font/google downloaded them from Google Fonts during every build, and a bad response there
   failed release builds at random. deep-lab.css picks them up through these CSS variables.
   (next/font needs plain string literals here, so the paths are written out.) */
const display = localFont({
    src: "../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
    weight: "300 700",
    variable: "--font-space-grotesk",
    display: "swap",
});
const body = localFont({
    src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
    weight: "100 900",
    variable: "--font-inter",
    display: "swap",
});
const mono = localFont({
    src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
    weight: "100 800",
    variable: "--font-jetbrains",
    display: "swap",
});

export const fontVariables = [display.variable, body.variable, mono.variable].join(" ");
