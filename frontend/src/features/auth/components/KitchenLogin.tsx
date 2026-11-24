"use client";

import { useParams } from "next/navigation";
import RoleLogin from "@/features/auth/components/RoleLogin";

export default function KitchenLogin() {
    const res = String(useParams().res);
    return <RoleLogin title="Kitchen Login" role="chef" resSlug={res} next={`/${res}/kitchen`} />;
}
