'use client';

import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Landing } from "@/components/marketing/landing/Landing";
import { Tour } from "@/components/marketing/tour/Tour";

// The technical tour opens over the landing page on the first visit in a tab;
// closing it leaves the original landing page. "Tour" in the nav reopens it.
export default function Home() {
    const [tourOpen, setTourOpen] = useState(false);

    useEffect(() => {
        try {
            if (sessionStorage.getItem("vm-tour-seen") !== "1") setTourOpen(true);
        } catch {
            setTourOpen(true);
        }
    }, []);

    const closeTour = () => {
        setTourOpen(false);
        try {
            sessionStorage.setItem("vm-tour-seen", "1");
        } catch {}
    };

    return (
        <>
            <Landing onOpenTour={() => setTourOpen(true)} />
            <AnimatePresence>{tourOpen && <Tour onClose={closeTour} />}</AnimatePresence>
        </>
    );
}
