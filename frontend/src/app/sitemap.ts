import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The public pages worth finding in search.
export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    return [
        { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
        { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
        { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    ];
}
