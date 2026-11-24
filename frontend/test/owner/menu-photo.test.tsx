import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../msw";

// VM-02: the owner's photo is uploaded as a file first; the item is saved with the short URL.
vi.mock("@/lib/firebase", () => ({ auth: {} }));
const { ResContext } = await import("@/lib/restaurantContext");
const { default: ItemForm } = await import("@/features/restaurant/components/ItemForm");
// CL-09: Add and Edit are one ItemForm; without an item it adds, with one it edits.
const AddItemPopup = (p: { onClose: () => void; onSave: (i: unknown) => void }) => <ItemForm {...p} />;
const EditItemPopup = ({
    id,
    name,
    price,
    image,
    ...p
}: {
    id: string;
    name: string;
    price: number;
    image: string;
    onClose: () => void;
    onSave: (i: unknown) => void;
    onDelete: (id: string) => void;
}) => <ItemForm item={{ _id: id, name, price, image, isEnabled: true }} {...p} />;

URL.createObjectURL = vi.fn(() => "blob:preview");
URL.revokeObjectURL = vi.fn();

const URL_OK = "/api/menu/demo-bistro/images/" + "a".repeat(24);
const photo = () => new File([new Uint8Array(300_000)], "amok.jpg", { type: "image/jpeg" });

function uploads(status = 201, body: object = { url: URL_OK }) {
    const seen: { type: string | null; body: string }[] = [];
    server.use(
        http.post("*/api/menu/demo-bistro/images", async ({ request }) => {
            // raw body: undici's formData() can't read jsdom's File objects
            seen.push({ type: request.headers.get("content-type"), body: await request.text() });
            return HttpResponse.json(body, { status });
        }),
    );
    return seen;
}

const inRestaurant = (ui: React.ReactNode) => render(<ResContext.Provider value="demo-bistro">{ui}</ResContext.Provider>);
const choose = (file: File) => fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

describe("adding an item with a photo", () => {
    it("uploads the file, then saves the item with the returned URL (not base64)", async () => {
        const seen = uploads();
        const onSave = vi.fn();
        inRestaurant(<AddItemPopup onClose={() => {}} onSave={onSave} />);
        choose(photo());
        fireEvent.change(screen.getByPlaceholderText("Enter item name"), { target: { value: "Fish Amok" } });
        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "5.5" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(seen).toHaveLength(1);
        expect(seen[0].type).toMatch(/^multipart\/form-data/);
        // (jsdom sends the file as an empty "blob"; a browser sends the real name and bytes)
        expect(seen[0].body).toMatch(/name="image"; filename="[^"]+"\r\nContent-Type: image\/jpeg/);
        expect(seen[0].body).not.toContain("base64");
        expect(onSave).toHaveBeenCalledWith({ name: "Fish Amok", price: 5.5, image: URL_OK, isEnabled: true });
    });

    it("shows the server's reason when the upload is refused, and does not save", async () => {
        uploads(415, { message: "Please choose a JPG, PNG or WebP photo" });
        const onSave = vi.fn();
        inRestaurant(<AddItemPopup onClose={() => {}} onSave={onSave} />);
        choose(photo());
        fireEvent.change(screen.getByPlaceholderText("Enter item name"), { target: { value: "Fish Amok" } });
        fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "5.5" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Please choose a JPG, PNG or WebP photo");
        expect(onSave).not.toHaveBeenCalled();
    });

    it("refuses a file over 5 MB before uploading it", async () => {
        const seen = uploads();
        inRestaurant(<AddItemPopup onClose={() => {}} onSave={vi.fn()} />);
        choose(new File([new Uint8Array(6 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" }));
        expect(await screen.findByRole("alert")).toHaveTextContent(/5 MB/);
        expect(seen).toHaveLength(0);
    });
});

describe("editing an item's photo", () => {
    const item = { id: "i1", name: "Amok", price: 5, image: "https://images.example/old.jpg" };

    it("uploads a new photo and saves the item with its URL", async () => {
        const seen = uploads();
        const onSave = vi.fn();
        inRestaurant(<EditItemPopup {...item} onClose={() => {}} onSave={onSave} onDelete={() => {}} />);
        choose(photo());
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(seen).toHaveLength(1);
        expect(onSave.mock.calls[0][0].image).toBe(URL_OK);
    });

    it("keeps the old photo, without uploading, when only the name changes", async () => {
        const seen = uploads();
        const onSave = vi.fn();
        inRestaurant(<EditItemPopup {...item} onClose={() => {}} onSave={onSave} onDelete={() => {}} />);
        fireEvent.change(screen.getByDisplayValue("Amok"), { target: { value: "Fish Amok" } });
        fireEvent.click(screen.getByRole("button", { name: /save/i }));
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(seen).toHaveLength(0);
        expect(onSave.mock.calls[0][0]).toMatchObject({ name: "Fish Amok", image: item.image });
    });
});
