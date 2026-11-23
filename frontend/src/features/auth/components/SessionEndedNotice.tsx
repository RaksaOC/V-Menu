"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Shown on a login page reached with ?expired=1 (VM-03). */
export default function SessionEndedNotice() {
    const [expired, setExpired] = useState(false);
    useEffect(() => {
        setExpired(new URLSearchParams(window.location.search).get("expired") === "1");
    }, []);
    if (!expired) return null;
    return (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            <Clock size={16} aria-hidden /> Your session ended, please sign in again.
        </p>
    );
}
