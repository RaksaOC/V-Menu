import { FAQS } from "@/components/marketing/landing/faq-data";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Schema.org data for search engines: what V-Menu is, who makes it, and the FAQ, so results can
// show it as rich snippets. Rendered on the server, inside the landing page.
const DATA = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
            url: SITE_URL,
            logo: `${SITE_URL}/favicon.png`,
        },
        {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            publisher: { "@id": `${SITE_URL}/#organization` },
        },
        {
            "@type": "SoftwareApplication",
            name: SITE_NAME,
            url: SITE_URL,
            description: SITE_DESCRIPTION,
            applicationCategory: "BusinessApplication",
            applicationSubCategory: "Restaurant ordering",
            operatingSystem: "Any (web browser)",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free to start" },
            featureList: [
                "QR code menu for every table",
                "Ordering from the guest's phone, no app",
                "Live kitchen screen",
                "One running bill per table",
                "Call staff and request the bill from the table",
                "Sales and best-seller reports",
                "Staff roles for owners, cashiers and chefs",
                "Several restaurants in one account",
            ],
            publisher: { "@id": `${SITE_URL}/#organization` },
        },
        {
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
        },
    ],
};

export function StructuredData() {
    // "<" is escaped so the JSON can never close the script tag early.
    const json = JSON.stringify(DATA).replace(/</g, "\\u003c");
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
