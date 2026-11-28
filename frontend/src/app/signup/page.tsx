import type { Metadata } from "next";
import SignupPage from "@/features/auth/components/SignupPage";

export const metadata: Metadata = {
    title: "Create your restaurant",
    description: "Set up QR code menus and table ordering for your restaurant in minutes. Free to start.",
    alternates: { canonical: "/signup" },
};

export default function Page() {
    return <SignupPage />;
}
