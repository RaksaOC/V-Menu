"use client";

import RoleLogin from "@/features/auth/components/RoleLogin";

export default function OwnerLogin() {
    return <RoleLogin title="Owner Login" role="owner" next="/owner" />;
}
