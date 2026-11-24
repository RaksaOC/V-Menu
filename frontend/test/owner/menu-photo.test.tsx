import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-02: the owner's photo is uploaded as a file first; the item is saved with the short URL.
// PHOTOS-S3: the upload is three steps: a signed form from menu-service, the file posted straight
// to object storage with it, then the key confirmed with menu-service, which answers the URL.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
const { ResContext } = await import("@/lib/restaurant-context");
const { default: ItemForm } = await import("@/features/restaurant/components/ItemForm");
// CL-09: Add and Edit are one ItemForm; without an item it adds, with one it edits.
const AddItemPopup = (p: { onClose: () => void; onSave: (i: unknown) => void }) => <ItemForm {...p} />;
const EditItemPopup = ({
    id,
    name,
    priceCents,
    image,
    ...p
}: {
    id: string;
    name: string;
    priceCents: number;
    image: string;
    onClose: () => void;
    onSave: (i: unknown) => void;
    onDelete: (id: string) => void;
}) => <ItemForm item={{ _id: id, name, priceCents, image, isEnabled: true }} {...p} />;

URL.createObjectURL = vi.fn(() => "blob:preview");
URL.revokeObjectURL = vi.fn();

const URL_OK = "/api/menu/demo-bistro/images/" + "a".repeat(24);
const STORAGE = "http://storage.test/vmenu-photos";
const KEY = "incoming/64b000000000000000000001/" + "f".repeat(32);
const photo = () => new File([new Uint8Array(300_000)], "amok.jpg", { type: "image/jpeg" });
const s3Error = (status: number, code: string, message: string) =>
    new HttpResponse(`<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`, {
        status,
        headers: { "Content-Type": "application/xml" },
    });

/** The three calls, each answering as given; records what each one was sent. */
function uploads({
    sign = () =>
        HttpResponse.json(
            {
                key: KEY,
                url: STORAGE,
                fields: { key: KEY, "Content-Type": "image/jpeg", policy: "p", "x-amz-signature": "s" },
                expiresAt: "",
                maxBytes: 5242880,
            },
            { status: 201 },
        ),
    store = () => new HttpResponse(null, { status: 204 }),
    confirm = () => HttpResponse.json({ url: URL_OK }, { status: 201 }),
}: { sign?: () => Response; store?: () => Response; confirm?: () => Response } = {}) {
    const seen = {
        sign: [] as unknown[],
        store: [] as { body: string; cookie: string | null }[],
        confirm: [] as unknown[],
        order: [] as string[],
    };
    server.use(
        http.post("*/api/menu/demo-bistro/images/uploads", async ({ request }) => {
            seen.order.push("sign");
            seen.sign.push(await request.json());
            return sign();
        }),
        http.post(STORAGE, async ({ request }) => {
            seen.order.push("store");
            // raw body: undici's formData() can't read jsdom's File objects
            seen.store.push({ body: await request.text(), cookie: request.headers.get("cookie") });
            return store();
        }),
        http.post("*/api/menu/demo-bistro/images", async ({ request }) => {
            seen.order.push("confirm");
            seen.confirm.push(await request.json());
            return confirm();
        }),
    );
    return seen;
}

const inRestaurant = (ui: React.ReactNode) => render(<ResContext.Provider value="demo-bistro">{ui}</ResContext.Provider>);
const choose = (file: File) => fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
function addDish(onSave = vi.fn()) {
    inRestaurant(<AddItemPopup onClose={() => {}} onSave={onSave} />);
    choose(photo());
    fireEvent.change(screen.getByPlaceholderText("Enter item name"), { target: { value: "Fish Amok" } });
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "5.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    return onSave;
}

describe("adding an item with a photo (PHOTOS-S3)", () => {
    it("signs, posts the file to storage with the form's fields, confirms the key, then saves the item with the URL", async () => {
        const seen = uploads();
        const onSave = addDish();

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(seen.order).toEqual(["sign", "store", "confirm"]);
        expect(seen.sign).toEqual([{ contentType: "image/jpeg" }]);
        // every signed field, then the file last (S3 ignores fields after the file)
        const body = seen.store[0].body;
        for (const field of ["key", "Content-Type", "policy", "x-amz-signature"]) expect(body).toContain(`name="${field}"`);
        expect(body.indexOf('name="file"')).toBeGreaterThan(body.indexOf('name="x-amz-signature"'));
        expect(body).toMatch(/name="file"; filename="[^"]+"\r\nContent-Type: image\/jpeg/);
        expect(body).not.toContain("base64");
        expect(seen.store[0].cookie).toBeNull(); // the sign-in cookie never goes to storage
        expect(seen.confirm).toEqual([{ key: KEY }]);
        expect(onSave).toHaveBeenCalledWith({
            name: "Fish Amok",
            priceCents: 550,
            image: URL_OK,
            isEnabled: true,
            description: "",
            tags: [],
        });
    });

    it("shows the server's reason when signing is refused, and does not post or save", async () => {
        const seen = uploads({
            sign: () =>
                HttpResponse.json({ message: "Too many photo uploads for this restaurant. Please try again later." }, { status: 429 }),
        });
        const onSave = addDish();
        expect(await screen.findByRole("alert")).toHaveTextContent("Too many photo uploads");
        expect(seen.order).toEqual(["sign"]);
        expect(onSave).not.toHaveBeenCalled();
    });

    it("storage says the file is too big: a clear 5 MB message", async () => {
        const seen = uploads({
            store: () => s3Error(400, "EntityTooLarge", "Your proposed upload exceeds the maximum allowed object size."),
        });
        const onSave = addDish();
        expect(await screen.findByRole("alert")).toHaveTextContent("Photos can be at most 5 MB");
        expect(seen.order).toEqual(["sign", "store"]);
        expect(onSave).not.toHaveBeenCalled();
    });

    it("storage refuses the type: a clear JPG, PNG or WebP message", async () => {
        uploads({
            store: () =>
                s3Error(403, "AccessDenied", 'Invalid according to Policy: Policy Condition failed: ["eq", "$Content-Type", "image/jpeg"]'),
        });
        addDish();
        expect(await screen.findByRole("alert")).toHaveTextContent("Please choose a JPG, PNG or WebP photo");
    });

    it("the signed form expired: says so and asks to try again", async () => {
        uploads({ store: () => s3Error(403, "AccessDenied", "Invalid according to Policy: Policy expired.") });
        addDish();
        expect(await screen.findByRole("alert")).toHaveTextContent(/expired.*try again/i);
    });

    it("the upload expired before it was confirmed: the server's message", async () => {
        uploads({
            confirm: () => HttpResponse.json({ message: "This upload has expired. Please choose the photo again." }, { status: 410 }),
        });
        const onSave = addDish();
        expect(await screen.findByRole("alert")).toHaveTextContent("This upload has expired");
        expect(onSave).not.toHaveBeenCalled();
    });

    it("the server finds it isn't a photo: its reason", async () => {
        uploads({ confirm: () => HttpResponse.json({ message: "Please choose a JPG, PNG or WebP photo" }, { status: 415 }) });
        addDish();
        expect(await screen.findByRole("alert")).toHaveTextContent("Please choose a JPG, PNG or WebP photo");
    });

    it("storage can't be reached: a connection message", async () => {
        uploads({ store: () => HttpResponse.error() });
        addDish();
        expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach/i);
    });

    it("refuses a file over 5 MB, or of another type, before any upload", async () => {
        const seen = uploads();
        inRestaurant(<AddItemPopup onClose={() => {}} onSave={vi.fn()} />);
        choose(new File([new Uint8Array(6 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(/5 MB/);
        choose(new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }));
        expect(await screen.findByRole("alert")).toHaveTextContent("Please choose a JPG, PNG or WebP photo");
        expect(seen.order).toEqual([]);
    });
});

describe("editing an item's photo", () => {
    const item = { id: "i1", name: "Amok", priceCents: 500, image: "https://images.example/old.jpg" };

    it("uploads a new photo and saves the item with its URL", async () => {
        const seen = uploads();
        const onSave = vi.fn();
        inRestaurant(<EditItemPopup {...item} onClose={() => {}} onSave={onSave} onDelete={() => {}} />);
        choose(photo());
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(seen.order).toEqual(["sign", "store", "confirm"]);
        expect(onSave.mock.calls[0][0].image).toBe(URL_OK);
    });

    it("keeps the old photo, without uploading, when only the name changes", async () => {
        const seen = uploads();
        const onSave = vi.fn();
        inRestaurant(<EditItemPopup {...item} onClose={() => {}} onSave={onSave} onDelete={() => {}} />);
        fireEvent.change(screen.getByDisplayValue("Amok"), { target: { value: "Fish Amok" } });
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(seen.order).toEqual([]);
        expect(onSave.mock.calls[0][0]).toMatchObject({ name: "Fish Amok", image: item.image });
    });
});
