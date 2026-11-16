import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/* Self-hosted by next/font at build time. deep-lab.css picks them up through these variables. */
const display = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-space-grotesk" });
const body = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-jetbrains" });

export const fontVariables = [display.variable, body.variable, mono.variable].join(" ");
