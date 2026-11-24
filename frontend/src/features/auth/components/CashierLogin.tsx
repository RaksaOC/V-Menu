"use client";

import { useParams } from "next/navigation";
import RoleLogin from "@/features/auth/components/RoleLogin";

export default function CashierLogin() {
    const res = String(useParams().res);
    return <RoleLogin title="Cashier Login" role="cashier" resSlug={res} next={`/${res}/cashier/dashboard`} />;
}
