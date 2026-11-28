import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL, isIndexedHost } from "@/lib/site";

// Answered per request, so staging and previews (same build, other hosts) stay out of search.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
    const host = (await headers()).get("host");
    if (!isIndexedHost(host)) return { rules: { userAgent: "*", disallow: "/" } };
    return {
        rules: {
            userAgent: "*",
            allow: ["/", "/signup", "/login"],
            // signed-in screens and each table's ordering pages are not for search results
            disallow: ["/owner", "/ui-kit", "/api/", "/*/cashier", "/*/kitchen", "/*/customer", "/*/t/"],
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
