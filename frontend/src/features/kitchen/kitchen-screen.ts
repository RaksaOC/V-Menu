// VM-29: what makes the kitchen board work as a kitchen screen: the age chip and the new-order sound.

export type AgeTone = "fresh" | "waiting" | "late";

/** Green under 5 minutes, the accent colour from 5 to 15, red over 15. */
export function ageTone(ageMs: number): AgeTone {
    const minutes = ageMs / 60_000;
    if (minutes < 5) return "fresh";
    return minutes <= 15 ? "waiting" : "late";
}

/** "Just now", "7 min", "1 h 20 min". */
export function ageLabel(ageMs: number): string {
    const minutes = Math.max(0, Math.floor(ageMs / 60_000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
}

/** Fixed colours, readable from across a kitchen; nothing pulses. */
export const AGE_CHIP_CLASS: Record<AgeTone, string> = {
    fresh: "bg-green-700 text-white",
    waiting: "bg-[var(--accent)] text-[var(--accent-ink)]",
    late: "bg-red-700 text-white",
};

export interface SoundPlayer {
    /** Must run from a tap: browsers only let a page play sound after the user did something. */
    unlock(): Promise<boolean>;
    /** A short two-note chime; silent until unlocked. */
    play(): void;
}

type MakeAudio = () => AudioContext;
const browserAudio: MakeAudio = () => {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new Audio();
};

/** The new-order chime, made with Web Audio, so there's no sound file to load. */
export function chimePlayer(make: MakeAudio = browserAudio): SoundPlayer {
    let ctx: AudioContext | null = null;
    return {
        async unlock() {
            try {
                ctx ??= make();
                if (ctx.state !== "running") await ctx.resume();
                return ctx.state === "running";
            } catch {
                ctx = null;
                return false;
            }
        },
        play() {
            if (!ctx || ctx.state !== "running") return;
            try {
                const start = ctx.currentTime;
                [880, 1320].forEach((frequency, i) => {
                    const at = start + i * 0.18;
                    const tone = ctx!.createOscillator();
                    const volume = ctx!.createGain();
                    tone.type = "sine";
                    tone.frequency.setValueAtTime(frequency, at);
                    volume.gain.setValueAtTime(0.0001, at);
                    volume.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
                    volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
                    tone.connect(volume);
                    volume.connect(ctx!.destination);
                    tone.start(at);
                    tone.stop(at + 0.32);
                });
            } catch {
                /* a sound that fails must never break the board */
            }
        },
    };
}
