import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import { fontVariables } from "@/theme/fonts";
import { ThemeSync, themeScript } from "@/theme/ThemeSync";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    category: "business",
    icons: {
        icon: [
            { url: "/logo.svg", type: "image/svg+xml" },
            { url: "/favicon.png", type: "image/png" },
        ],
        apple: "/apple-touch-icon.png",
    },
    openGraph: {
        type: "website",
        siteName: SITE_NAME,
        title: SITE_TITLE,
        description: SITE_DESCRIPTION,
        url: "/",
        locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
    formatDetection: { telephone: false },
};

export const viewport: Viewport = {
    colorScheme: "light dark",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#00211c" },
    ],
};

/* Applies the saved light/dark choice before first paint, so pages don't flash. Light is the
   default; the theme button on the landing page saves the other choice. Dark only applies on
   the pages that have dark styles (see ThemeSync). */

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
