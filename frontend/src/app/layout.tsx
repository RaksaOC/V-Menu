import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/theme/fonts";
import { DARK_READY, ThemeSync } from "@/theme/ThemeSync";
import "./globals.css";

export const metadata: Metadata = {
    title: "V-Menu",
    description: "QR-code restaurant ordering, split into three microservices.",
    icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
    colorScheme: "light dark",
};

/* Applies the saved light/dark choice before first paint, so pages don't flash. Light is the
   default; the theme button on the landing page saves the other choice. Dark only applies on
   the pages that have dark styles (see ThemeSync). */
const themeScript = `try{var p=location.pathname;var t=localStorage.getItem("vm-theme")==="dark"&&(${DARK_READY})?"dark":"light";var d=document.documentElement;d.dataset.theme=t;d.classList.toggle("dark",t==="dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" data-look="deep-lab" data-theme="light" className={fontVariables} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
            </head>
            <body>
                <ThemeSync />
                {children}
            </body>
        </html>
    );
}
