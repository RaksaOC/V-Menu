import type { Metadata } from "next";
import OwnerLogin from "@/features/auth/components/OwnerLogin";

export const metadata: Metadata = { title: "Owner log in", robots: { index: false, follow: true } };

export default function Page() {
    return <OwnerLogin />;
}
