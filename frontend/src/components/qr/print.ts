import QRCode from "qrcode";

// Making and printing table QR codes (VM-01). The QR images are PNG data URLs made in the
// browser, so nothing is sent anywhere and the codes work offline once printed.

export interface QrCard {
    restaurantName?: string;
    tableName: string;
    url: string;
}

const PER_PAGE = 6; // 2 x 3 cards on an A4 page

/** A PNG data URL of the QR code for `text`; medium error correction survives a bit of wear. */
export function qrDataUrl(text: string, width = 640): Promise<string> {
    return QRCode.toDataURL(text, { width, margin: 2, errorCorrectionLevel: "M" });
}

const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** A printable A4 document with one card per table: restaurant, QR code, table name, "Scan to order". */
export function qrSheetHtml(cards: { restaurantName?: string; tableName: string; dataUrl: string }[]): string {
    const pages: string[] = [];
    for (let i = 0; i < cards.length; i += PER_PAGE) {
        const items = cards.slice(i, i + PER_PAGE).map(
            (c) => `<div class="card">
  ${c.restaurantName ? `<div class="res">${escapeHtml(c.restaurantName)}</div>` : ""}
  <img src="${escapeHtml(c.dataUrl)}" alt="QR code for table ${escapeHtml(c.tableName)}">
  <div class="table">${escapeHtml(c.tableName)}</div>
  <div class="hint">Scan to order</div>
</div>`,
        );
        pages.push(`<section class="page">${items.join("\n")}</section>`);
    }
    return `<!doctype html><html><head><meta charset="utf-8"><title>Table QR codes</title><style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, Arial, sans-serif; color: #000; }
.page { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 88mm; gap: 6mm; break-after: page; }
.page:last-child { break-after: auto; }
.card { border: 1px dashed #93939f; border-radius: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4mm; break-inside: avoid; }
.res { font-size: 11pt; font-weight: 600; text-align: center; }
img { width: 56mm; height: 56mm; image-rendering: pixelated; }
.table { font-family: "JetBrains Mono", Consolas, monospace; font-size: 20pt; font-weight: 700; letter-spacing: 0.02em; }
.hint { font-size: 9pt; color: #63637a; text-transform: uppercase; letter-spacing: 0.08em; }
</style></head><body>${pages.join("\n")}</body></html>`;
}

/** Opens the print dialog with one card per table, in a hidden frame so the page itself is untouched. */
export async function printQrCards(cards: QrCard[]): Promise<void> {
    const withImages = await Promise.all(cards.map(async (c) => ({ ...c, dataUrl: await qrDataUrl(c.url) })));
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    await new Promise<void>((resolve) => {
        frame.onload = () => resolve();
        frame.srcdoc = qrSheetHtml(withImages);
    });
    const win = frame.contentWindow;
    if (!win) {
        frame.remove();
        return;
    }
    win.addEventListener("afterprint", () => frame.remove(), { once: true });
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 60_000); // in case afterprint never fires
}
