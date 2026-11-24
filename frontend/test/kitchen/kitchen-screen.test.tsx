import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-29: the kitchen screen: a sound and a flash for new orders, the screen kept on, a kiosk
// mode, and a fixed age chip instead of pulsing dots.
vi.mock("react-toastify/dist/ReactToastify.css", () => ({}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({
    useParams: () => ({ res: "demo-bistro" }),
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => "/demo-bistro/kitchen",
}));
const { ageTone, chimePlayer } = await import("@/features/kitchen/kitchen-screen");
const { default: KitchenBoard } = await import("@/features/kitchen/components/KitchenBoard");
const { default: Card } = await import("@/features/kitchen/components/OrderCard");

const MIN = 60_000;
const dish = { _id: "665f00000000000000000aaa", name: "Kuy Teav", priceCents: 250, image: "/k.jpg", isEnabled: true };
const order = (n: number, minutesAgo: number, status: "pending" | "preparing" | "ready" = "pending") => ({
    _id: `665f00000000000000000${n}0${n}`,
    table: `T${n}`,
    status,
    statusHistory: [],
    createdAt: new Date(Date.now() - minutesAgo * MIN).toISOString(),
    orderedItems: [{ item: dish, quantity: 1 }],
});

describe("the age chip (VM-29)", () => {
    it.each([
        [0, "fresh"],
        [4.9, "fresh"],
        [5, "waiting"],
        [10, "waiting"],
        [15, "waiting"],
        [15.1, "late"],
        [90, "late"],
    ])("%s minutes is %s", (minutes, tone) => {
        expect(ageTone(minutes * MIN)).toBe(tone);
    });

    it("the card shows a fixed chip in the right colour, and nothing pulses", () => {
        const { container } = render(<Card order={order(1, 20)} />);
        const chip = screen.getByTestId("age-chip");
        expect(chip.dataset.tone).toBe("late");
        expect(chip.textContent).toMatch(/20 min/);
        expect(container.querySelector(".animate-pulse")).toBeNull();
    });
});

describe("the sound player (VM-29)", () => {
    function fakeAudio(state: "suspended" | "running" = "suspended") {
        const ctx = {
            state,
            currentTime: 0,
            destination: {},
            resume: vi.fn(async () => {
                ctx.state = "running";
            }),
            createOscillator: vi.fn(() => ({
                type: "",
                frequency: { setValueAtTime: vi.fn() },
                connect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
            })),
            createGain: vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() })),
        };
        return ctx;
    }

    it("stays silent until a tap unlocks it, then plays a short chime", async () => {
        const ctx = fakeAudio();
        const player = chimePlayer(() => ctx as unknown as AudioContext);
        player.play();
        expect(ctx.createOscillator).not.toHaveBeenCalled();
        expect(await player.unlock()).toBe(true);
        player.play();
        expect(ctx.createOscillator).toHaveBeenCalled();
    });

    it("without Web Audio it does nothing, and says so", async () => {
        const player = chimePlayer(() => {
            throw new Error("no audio");
        });
        expect(await player.unlock()).toBe(false);
        expect(() => player.play()).not.toThrow();
    });
});

describe("the kitchen board (VM-29)", () => {
    let queue: ReturnType<typeof order>[] = [];
    const sound = { unlock: vi.fn(async () => true), play: vi.fn() };
    const wakeLock = { request: vi.fn(async () => ({ released: false, release: vi.fn(async () => {}), addEventListener: vi.fn() })) };

    beforeEach(() => {
        queue = [order(1, 20), order(2, 7)];
        server.use(http.get("*/api/orders/demo-bistro/kitchen", () => HttpResponse.json(queue)));
        sound.play.mockClear();
        Object.defineProperty(navigator, "wakeLock", { value: wakeLock, configurable: true });
        document.documentElement.requestFullscreen = vi.fn(async () => {});
    });
    afterEach(() => {
        localStorage.clear();
    });

    it("keeps the screen on while the page is open", async () => {
        render(<KitchenBoard pollMs={50} sound={sound} />);
        await waitFor(() => expect(wakeLock.request).toHaveBeenCalledWith("screen"));
    });

    it("Start service unlocks the sound; a new order plays it and its card flashes once", async () => {
        render(<KitchenBoard pollMs={50} sound={sound} />);
        await screen.findByRole("heading", { name: "Table T1" });
        fireEvent.click(screen.getByRole("button", { name: "Start service" }));
        await waitFor(() => expect(sound.unlock).toHaveBeenCalled());
        expect(sound.play).not.toHaveBeenCalled(); // the orders already there are not new
        queue = [...queue, order(3, 0)];
        const fresh = await screen.findByRole("heading", { name: "Table T3" });
        await waitFor(() => expect(sound.play).toHaveBeenCalledTimes(1));
        expect(fresh.closest("article")!.dataset.new).toBe("true");
        expect(screen.getByRole("heading", { name: "Table T1" }).closest("article")!.dataset.new).toBeUndefined();
    });

    it("kiosk mode: full screen, large table numbers, oldest order first", async () => {
        queue = [order(2, 7), order(1, 20)];
        render(<KitchenBoard pollMs={60_000} sound={sound} />);
        await screen.findByRole("heading", { name: "Table T1" });
        fireEvent.click(screen.getByRole("button", { name: "Kiosk mode" }));
        expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
        const column = screen.getByRole("region", { name: "New" });
        const tables = within(column).getAllByRole("heading", { level: 3 });
        expect(tables.map((h) => h.textContent)).toEqual(["Table T1", "Table T2"]);
        expect(tables[0].className).toMatch(/text-5xl/); // 48 px
        expect(screen.getByRole("button", { name: "Kiosk mode" }).getAttribute("aria-pressed")).toBe("true");
        act(() => fireEvent.click(screen.getByRole("button", { name: "Kiosk mode" })));
        expect(within(column).getAllByRole("heading", { level: 3 })[0].className).not.toMatch(/text-5xl/);
    });
});
