import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// VM-01: every table gets a QR code that opens its menu.
const qr = vi.hoisted(() => ({ toDataURL: vi.fn(async (text: string) => `data:image/png;base64,${btoa(text)}`) }));
vi.mock("qrcode", () => ({ default: qr, ...qr }));
const printing = vi.hoisted(() => ({ printQrCards: vi.fn(async () => {}) }));
vi.mock("@/components/qr/print", async (orig) => ({ ...(await orig<object>()), printQrCards: printing.printQrCards }));
vi.mock("@/lib/firebase", () => ({ auth: {} }));

const { tableUrl } = await import("@/lib/table-url");
const { default: TableQrModal } = await import("@/components/qr/TableQrModal");
const { qrSheetHtml } = await import("@/components/qr/print");

const TOKEN = "AbCdEfGhIjKlMnOpQrSt_-";
const TOKEN2 = "ZyXwVuTsRqPoNmLkJiHg_-";

describe("tableUrl (SEC-04: the table's link token, never its name)", () => {
    it("builds the table's address from its token", () => {
        expect(tableUrl("demo-bistro", TOKEN, "https://v-menu.chanraksa.com")).toBe(`https://v-menu.chanraksa.com/demo-bistro/t/${TOKEN}`);
    });

    it("uses the site it runs on, so staging codes point to staging", () => {
        expect(tableUrl("demo-bistro", TOKEN)).toBe(`${window.location.origin}/demo-bistro/t/${TOKEN}`);
    });

    it("encodes the slug", () => {
        expect(tableUrl("a b", TOKEN, "https://x")).toBe(`https://x/a%20b/t/${TOKEN}`);
    });
});

describe("TableQrModal", () => {
    const open = (onClose = vi.fn()) =>
        render(<TableQrModal slug="demo-bistro" restaurantName="Demo Bistro" tableName="Patio 2" qrToken={TOKEN} onClose={onClose} />);

    it("shows a QR code for the table's menu, with the restaurant and table names", async () => {
        open();
        const img = await screen.findByRole("img", { name: "QR code for table Patio 2" });
        expect(qr.toDataURL).toHaveBeenCalledWith(tableUrl("demo-bistro", TOKEN), expect.any(Object));
        expect(img.getAttribute("src")).toMatch(/^data:image\/png;base64,/);
        expect(screen.getByRole("dialog", { name: /Patio 2/ })).toBeTruthy();
        expect(screen.getByText("Demo Bistro")).toBeTruthy();
    });

    it("downloads the code as a PNG named after the table", async () => {
        open();
        const link = await screen.findByRole("link", { name: /download png/i });
        expect(link.getAttribute("download")).toBe("demo-bistro-Patio-2-qr.png");
        expect(link.getAttribute("href")).toMatch(/^data:image\/png/);
    });

    it("prints the card for this table", async () => {
        open();
        fireEvent.click(await screen.findByRole("button", { name: /print/i }));
        await waitFor(() =>
            expect(printing.printQrCards).toHaveBeenCalledWith([
                { restaurantName: "Demo Bistro", tableName: "Patio 2", url: tableUrl("demo-bistro", TOKEN) },
            ]),
        );
    });

    it("closes with Escape and with the close button", async () => {
        const onClose = vi.fn();
        open(onClose);
        await screen.findByRole("img", { name: /QR code/ });
        fireEvent.keyDown(document, { key: "Escape" });
        fireEvent.click(screen.getByRole("button", { name: /close/i }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

describe("View QR Code buttons", () => {
    const table = { _id: "t1", name: "T1", isEnabled: true, qrToken: TOKEN };

    it("opens the QR code from the owner's table card", async () => {
        const { default: TableCard } = await import("@/features/restaurant/components/TableCard");
        render(<TableCard role="owner" table={table} onEdit={() => {}} />);
        fireEvent.click(screen.getByRole("button", { name: /view qr code/i }));
        expect(await screen.findByRole("img", { name: "QR code for table T1" })).toBeTruthy();
    });

    it("opens the QR code from the cashier's table card", async () => {
        const { default: TableCard } = await import("@/features/restaurant/components/TableCard");
        render(<TableCard role="cashier" table={table} onToggle={() => {}} />);
        fireEvent.click(screen.getByRole("button", { name: /view qr code/i }));
        expect(await screen.findByRole("img", { name: "QR code for table T1" })).toBeTruthy();
    });
});

describe("Print all QR codes", () => {
    it("prints one card per table from the owner's Tables page", async () => {
        const { answer } = await import("../api/helpers");
        const { ResContext } = await import("@/lib/restaurant-context");
        const { default: Tables } = await import("@/features/restaurant/components/Tables");
        answer("get", "/api/menu/demo-bistro/tables", [
            { _id: "t1", name: "T1", isEnabled: true, qrToken: TOKEN },
            { _id: "t2", name: "Patio 2", isEnabled: false, qrToken: TOKEN2 },
        ]);
        render(
            <ResContext.Provider value="demo-bistro">
                <Tables role="owner" />
            </ResContext.Provider>,
        );
        fireEvent.click(await screen.findByRole("button", { name: /print all qr codes/i }));
        expect(printing.printQrCards).toHaveBeenLastCalledWith([
            { tableName: "T1", url: tableUrl("demo-bistro", TOKEN) },
            { tableName: "Patio 2", url: tableUrl("demo-bistro", TOKEN2) },
        ]);
    });
});

describe("printed QR sheet", () => {
    const card = (n: number) => ({ restaurantName: "Demo Bistro", tableName: `T${n}`, dataUrl: "data:image/png;base64,AA" });

    it("puts 6 cards on each A4 page, each with the names and 'Scan to order'", () => {
        const html = qrSheetHtml(Array.from({ length: 7 }, (_, i) => card(i + 1)));
        expect(html).toContain("size: A4");
        expect(html.match(/class="page"/g)).toHaveLength(2);
        expect(html.match(/class="card"/g)).toHaveLength(7);
        expect(html.match(/Scan to order/g)).toHaveLength(7);
        expect(html).toContain("T7");
    });

    it("escapes names, so a table name can't inject markup", () => {
        const html = qrSheetHtml([{ restaurantName: "A & B", tableName: "<img src=x onerror=alert(1)>", dataUrl: "data:," }]);
        expect(html).not.toContain("<img src=x");
        expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
        expect(html).toContain("A &amp; B");
    });
});

describe("the restaurant's name on the QR code (VM-21)", () => {
    it("the Tables screen passes it to the QR popup", async () => {
        const { http, HttpResponse } = await import("msw");
        const { server } = await import("../msw");
        vi.doMock("next/navigation", () => ({ useParams: () => ({ res: "demo-bistro" }), useRouter: () => ({ push: vi.fn() }) }));
        server.use(
            http.get("*/api/menu/demo-bistro/tables", () =>
                HttpResponse.json([{ _id: "665f000000000000000000a1", name: "T1", isEnabled: true, qrToken: TOKEN }]),
            ),
            http.get("*/api/restaurants/demo-bistro/public", () => HttpResponse.json({ name: "Demo Bistro", slug: "demo-bistro" })),
        );
        const { ResContext } = await import("@/lib/restaurant-context");
        const { default: Tables } = await import("@/features/restaurant/components/Tables");
        render(
            <ResContext.Provider value="demo-bistro">
                <Tables role="cashier" />
            </ResContext.Provider>,
        );
        fireEvent.click(await screen.findByRole("button", { name: "View QR Code" }));
        expect(await screen.findByText("Demo Bistro")).toBeTruthy();
    });
});
