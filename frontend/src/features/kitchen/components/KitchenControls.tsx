import { Maximize2, Minimize2, Sun, Volume2, VolumeX } from "lucide-react";
import { BAND_BUTTON } from "@/features/kitchen/band";

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
        <div className="flex flex-wrap items-center gap-3">
            {soundState === "off" ? (
                <button type="button" onClick={onStartService} className={BAND_BUTTON}>
                    <Volume2 size={18} aria-hidden /> Start service
                </button>
            ) : (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                    {soundState === "on" ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
                    {soundState === "on" ? "Sound on for new orders" : "This device can't play sound"}
                </span>
            )}
            <button type="button" aria-pressed={kiosk} onClick={onToggleKiosk} className={`${BAND_BUTTON} ${kiosk ? "bg-white/15" : ""}`}>
                {kiosk ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />} Kiosk mode
            </button>
            <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
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
