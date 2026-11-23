import { WifiOff } from "lucide-react";

/** The red bar staff screens show while they can't reach the server (VM-03). */
export default function ConnectionLostBar() {
    return (
        <div role="alert" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            <WifiOff size={16} aria-hidden /> Connection lost, retrying…
        </div>
    );
}
