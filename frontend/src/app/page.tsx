import type { Metadata } from "next";
import Home from "@/components/marketing/Home";
import { StructuredData } from "@/components/marketing/StructuredData";
import { SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
    title: { absolute: SITE_TITLE },
    alternates: { canonical: "/" },
};

export default function Page() {
    return (
        <>
            <StructuredData />
            <Home />
        </>
    );
}
