import { useEffect, useState } from "react";
import type { Me } from "@vmenu/contracts";
import api from "@/lib/api";

/** VM-20: who is signed in, for the dashboard headers. Null while loading, or if the call failed. */
export function useMe(): Me | null {
    const [me, setMe] = useState<Me | null>(null);
    useEffect(() => {
        let current = true;
        api.get<Me>("/api/auth/me")
            .then(({ data }) => {
                if (current) setMe(data);
            })
            .catch(() => {}); // the header falls back to the role; an ended session is handled by the page's own calls
        return () => {
            current = false;
        };
    }, []);
    return me;
}
