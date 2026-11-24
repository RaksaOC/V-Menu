import { describe, expect, it } from "vitest";
import { restaurantsService } from "../../src/services/restaurants.service.js";
import { fakeMemberships, fakeRestaurants } from "./fakes.js";

// VM-24: each restaurant has its money settings (currency, exchange rate) and an optional payment
// QR code for the invoice. Anyone may read them; only the restaurant's owner may change them.
const status = (p: Promise<unknown>) => p.then(() => 200).catch((e: { status?: number }) => e.status ?? 500);
const owner = (uid: string) => ({ uid, email: `${uid}@x.test`, role: "owner" as const });

async function setup() {
    const restaurants = fakeRestaurants();
    const places = restaurantsService({ restaurants, memberships: fakeMemberships() });
    const r = await places.createForOwner("Mee Keav", { uid: "alice", email: "alice@x.test", name: "Alice" });
    return { restaurants, places, slug: r.slug, qr: `/api/menu/${r.slug}/images/${"a".repeat(24)}` };
}

describe("restaurant settings (VM-24)", () => {
    it("a restaurant that never set them shows US dollars at 4,100 riel, and no payment QR", async () => {
        const { places, slug } = await setup();
        expect(await places.settings(slug)).toEqual({ name: "Mee Keav", currency: "USD", khrPerUsd: 4100, paymentQrUrl: null });
    });

    it("the owner changes them; only what was sent changes", async () => {
        const { places, slug, qr } = await setup();
        expect(await places.updateSettings(owner("alice"), slug, { currency: "both", khrPerUsd: 4000 })).toEqual({
            name: "Mee Keav",
            currency: "both",
            khrPerUsd: 4000,
            paymentQrUrl: null,
        });
        await places.updateSettings(owner("alice"), slug, { paymentQrUrl: qr });
        expect(await places.settings(slug)).toMatchObject({ currency: "both", khrPerUsd: 4000, paymentQrUrl: qr });
        await places.updateSettings(owner("alice"), slug, { paymentQrUrl: null });
        expect((await places.settings(slug)).paymentQrUrl).toBeNull();
    });

    it("the answer has the public fields only", async () => {
        const { places, slug } = await setup();
        expect(Object.keys(await places.settings(slug)).sort()).toEqual(["currency", "khrPerUsd", "name", "paymentQrUrl"]);
    });

    it("another owner can't change them, and an unknown restaurant is 404", async () => {
        const { places, slug } = await setup();
        expect(await status(places.updateSettings(owner("bob"), slug, { currency: "KHR" }))).toBe(403);
        expect(await status(places.updateSettings(owner("alice"), "nope", { currency: "KHR" }))).toBe(404);
        expect(await status(places.settings("nope"))).toBe(404);
        expect((await places.settings(slug)).currency).toBe("USD");
    });

    it("the payment QR must be a photo uploaded for this restaurant", async () => {
        const { places, slug } = await setup();
        const elsewhere = `/api/menu/other-place/images/${"a".repeat(24)}`;
        expect(await status(places.updateSettings(owner("alice"), slug, { paymentQrUrl: elsewhere }))).toBe(400);
        expect(await status(places.updateSettings(owner("alice"), slug, { paymentQrUrl: "https://example.com/qr.png" }))).toBe(400);
        expect(await status(places.updateSettings(owner("alice"), slug, { currency: "EUR" }))).toBe(400);
    });
});
