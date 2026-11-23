"use client";

import { ToastContainer } from "react-toastify";

/** Where toasts appear; put it once on a page. The toasts themselves come from lib/toast (CL-10). */
export function ToastHost() {
    return <ToastContainer position="top-center" newestOnTop limit={3} />;
}
export { toast } from "@/lib/toast";
