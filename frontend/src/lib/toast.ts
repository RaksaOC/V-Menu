import { toast as toastify, type ToastOptions } from "react-toastify";

// The one toast style of the app (Deep Lab tokens, see .vm-toast in app/globals.css).
// Use toast.success / info / error(message) instead of passing options at each call.
const base: ToastOptions = {
    position: "top-center",
    autoClose: 2000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    className: "vm-toast",
};

export const toast = {
    // VM-36: good news is a polite status; only an error interrupts as an alert
    success: (message: string) => toastify.success(message, { ...base, role: "status" }),
    info: (message: string) => toastify.info(message, { ...base, role: "status" }),
    error: (message: string) => toastify.error(message, { ...base, role: "alert", autoClose: 4000 }),
};
