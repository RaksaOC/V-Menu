import type { Metadata } from "next";
import LoginPage from "@/features/auth/components/LoginPage";

export const metadata: Metadata = {
    title: "Log in",
    description: "Log in to V-Menu to run your restaurant: tables, bills, the kitchen screen and your menu.",
    alternates: { canonical: "/login" },
};

export default function Page() {
    return <LoginPage />;
}
