import type { Metadata } from "next";
import OwnerDashboard from "@/features/owner/components/OwnerDashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function Page() {
    return <OwnerDashboard />;
}
