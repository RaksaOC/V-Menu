import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-24: the owner's Preferences tab sets the currency, the exchange rate and the payment QR.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("next/navigation", () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }) }));
const { default: Preferences } = await import("@/features/owner/components/preferences/Preferences");
const { ResContext } = await import("@/lib/restaurant-context");

const QR = `/api/menu/demo-bistro/images/${"b".repeat(24)}`;
function api() {
    const saved: unknown[] = [];
    let current = { name: "Demo Bistro", currency: "USD", khrPerUsd: 4100, paymentQrUrl: null as string | null };
    server.use(
        http.get("*/api/restaurants/demo-bistro/settings", () => HttpResponse.json(current)),
        http.put("*/api/restaurants/demo-bistro/settings", async ({ request }) => {
            const body = (await request.json()) as object;
            saved.push(body);
            current = { ...current, ...body };
            return HttpResponse.json(current);
        }),
        // PHOTOS-S3: a signed form, the post to storage, then the confirm that answers the URL
        http.post("*/api/menu/demo-bistro/images/uploads", () =>
            HttpResponse.json(
                { key: "incoming/k", url: "http://storage.test/vmenu-photos", fields: { key: "incoming/k" } },
                { status: 201 },
            ),
        ),
        http.post("http://storage.test/vmenu-photos", () => new HttpResponse(null, { status: 204 })),
        http.post("*/api/menu/demo-bistro/images", () => HttpResponse.json({ url: QR }, { status: 201 })),
    );
    return saved;
}
const show = () =>
    render(
        <ResContext.Provider value="demo-bistro">
            <Preferences />
        </ResContext.Provider>,
    );

describe("the owner's preferences (VM-24)", () => {
    it("saves the currency and the exchange rate, with a preview", async () => {
        const saved = api();
        show();
        const both = await screen.findByRole("radio", { name: /Both/ });
        expect((screen.getByRole("radio", { name: /US dollars/ }) as HTMLInputElement).checked).toBe(true);
        fireEvent.click(both);
        fireEvent.change(screen.getByLabelText("Riel per US dollar"), { target: { value: "4000" } });
        expect(screen.getByText("$2.50 · ៛10,000")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
        await screen.findByText("Saved");
        expect(saved).toEqual([{ currency: "both", khrPerUsd: 4000, paymentQrUrl: null }]);
    });

    it("refuses a rate that isn't a whole number between 1,000 and 10,000", async () => {
        const saved = api();
        show();
        fireEvent.change(await screen.findByLabelText("Riel per US dollar"), { target: { value: "41.5" } });
        fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
        expect(await screen.findByText(/whole number between 1,000 and 10,000/)).toBeTruthy();
        expect(saved).toEqual([]);
    });

    it("uploads a payment QR, shows it, and can remove it", async () => {
        const saved = api();
        show();
        const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "khqr.png", { type: "image/png" });
        fireEvent.change(await screen.findByLabelText("Upload payment QR"), { target: { files: [file] } });
        expect((await screen.findByRole("img", { name: "Payment QR" })).getAttribute("src")).toBe(QR);
        fireEvent.click(screen.getByRole("button", { name: "Save settings" }));
        await waitFor(() => expect(saved).toEqual([{ currency: "USD", khrPerUsd: 4100, paymentQrUrl: QR }]));
        fireEvent.click(screen.getByRole("button", { name: "Remove QR" }));
        expect(screen.queryByRole("img", { name: "Payment QR" })).toBeNull();
    });
});
