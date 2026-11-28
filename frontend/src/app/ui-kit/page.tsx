import type { Metadata } from "next";
import KitchenSink from "@/components/ui/KitchenSink";

// CL-09: every UI kit component on one page. No data, not linked from the app, not indexed.
export const metadata: Metadata = { title: "UI kit", robots: { index: false, follow: false } };

export default function Page() {
    return <KitchenSink />;
}
