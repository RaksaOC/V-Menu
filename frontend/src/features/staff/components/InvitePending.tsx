import { Chip } from "@/components/ui";
import type { StaffMember } from "@vmenu/contracts";

/** VM-12: shown for an invite nobody has accepted yet (no account linked to it). */
export default function InvitePending({ member }: { member: Pick<StaffMember, "tenantId"> }) {
    if (member.tenantId) return null;
    return (
        <Chip tone="accent" title="They haven't signed in at /login with this email yet" className="whitespace-nowrap">
            Invite pending
        </Chip>
    );
}
