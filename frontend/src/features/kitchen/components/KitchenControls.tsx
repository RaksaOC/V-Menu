import { Maximize2, Minimize2, Sun, Volume2, VolumeX } from "lucide-react";

export type SoundState = "off" | "on" | "unavailable";

/** VM-29: Start service (unlocks the sound), kiosk mode, and whether the screen stays on. */
export default function KitchenControls({
    soundState,
    onStartService,
    kiosk,
    onToggleKiosk,
    screenOn,
}: {
    soundState: SoundState;
    onStartService: () => void;
    kiosk: boolean;
    onToggleKiosk: () => void;
    screenOn: string;
}) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-3">
            {soundState === "off" ? (
                <button
                    type="button"
                    onClick={onStartService}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 font-bold text-[var(--accent-ink)] shadow hover:brightness-95"
                >
                    <Volume2 size={18} aria-hidden /> Start service
                </button>
            ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                    {soundState === "on" ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
                    {soundState === "on" ? "Sound on for new orders" : "This device can't play sound"}
                </span>
            )}
            <button
                type="button"
                aria-pressed={kiosk}
                onClick={onToggleKiosk}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${kiosk ? "bg-white text-slate-800" : "bg-white/15 hover:bg-white/25"}`}
            >
                {kiosk ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />} Kiosk mode
            </button>
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-200">
                <Sun size={16} aria-hidden />
                {screenOn === "on"
                    ? "Screen stays on"
                    : screenOn === "unsupported"
                      ? "Screen may turn off on this device"
                      : "Screen may turn off"}
            </span>
        </div>
    );
}
