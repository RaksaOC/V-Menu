import { ImageResponse } from "next/og";

// The picture shown when someone shares a V-Menu link (also used for X/Twitter cards).
export const alt = "V-Menu: guests scan, the kitchen cooks, you get paid.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TICKETS = [
    { table: "Table 4", items: "2× Fish amok · 1× Kuy teav", color: "#ff7759" },
    { table: "Table 7", items: "1× Beef lok lak", color: "#e6a23c" },
    { table: "Table 2", items: "3× Num banh chok", color: "#4fd1a5" },
];

export default function OpengraphImage() {
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                padding: 64,
                backgroundColor: "#00211c",
                backgroundImage: "radial-gradient(circle at 18% 20%, #6b2f22 0%, #00211c 45%)",
                color: "#ffffff",
                fontFamily: "sans-serif",
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <svg width="60" height="60" viewBox="0 0 64 64">
                        <rect width="64" height="64" rx="18" fill="#17171c" />
                        <path
                            d="M11 19.5V15a4 4 0 0 1 4-4h4.5M53 44.5V49a4 4 0 0 1-4 4h-4.5"
                            fill="none"
                            stroke="rgba(255,255,255,0.42)"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                        <path
                            d="M17 26 29.5 45 47.5 17"
                            fill="none"
                            stroke="#ff7759"
                            strokeWidth="7.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <div style={{ fontSize: 36, fontWeight: 700 }}>V-Menu</div>
                </div>
                <div
                    style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}
                >
                    <span>Guests scan.</span>
                    <span>The kitchen cooks.</span>
                    <span style={{ color: "#ff8a70" }}>You get paid.</span>
                </div>
                <div style={{ fontSize: 26, color: "#cfe0da" }}>QR code menus and table ordering for restaurants</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 18, marginLeft: "auto", width: 400 }}>
                <div style={{ fontSize: 20, color: "#a7bfb8", letterSpacing: 3 }}>KITCHEN · LIVE</div>
                {TICKETS.map((t) => (
                    <div
                        key={t.table}
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            padding: "20px 24px",
                            borderRadius: 20,
                            background: "#003c33",
                            borderLeft: `8px solid ${t.color}`,
                        }}
                    >
                        <span style={{ fontSize: 30, fontWeight: 700 }}>{t.table}</span>
                        <span style={{ fontSize: 22, color: "#cfe0da" }}>{t.items}</span>
                    </div>
                ))}
            </div>
        </div>,
        size,
    );
}
