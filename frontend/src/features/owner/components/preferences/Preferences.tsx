"use client";

import { useContext, useEffect, useId, useState } from "react";
import { QrCode, Save, Trash2, Upload } from "lucide-react";
import type { RestaurantSettings } from "@vmenu/contracts";
import { Button, Input } from "@/components/ui";
import { MoneyProvider, Price } from "@/components/money/MoneyProvider";
import { ResContext } from "@/lib/restaurant-context";
import { getRestaurantSettings, saveRestaurantSettings } from "@/lib/restaurant-settings";
import { uploadMenuPhoto } from "@/features/restaurant/api";
import { apiErrorMessage } from "@/lib/api";

type Currency = RestaurantSettings["currency"];
const CURRENCIES: { value: Currency; label: string; hint: string }[] = [
    { value: "USD", label: "US dollars ($)", hint: "$2.50" },
    { value: "KHR", label: "Riel (៛)", hint: "Prices converted at your rate, rounded to 100 riel" },
    { value: "both", label: "Both ($ and ៛)", hint: "Dollars first, then riel" },
];
const RATE_ERROR = "Enter a whole number between 1,000 and 10,000";
const validRate = (rate: string) => /^\d+$/.test(rate.trim()) && Number(rate) >= 1000 && Number(rate) <= 10000;

/**
 * VM-24: the restaurant's settings. How prices show on every page (US dollars, riel or both, at
 * the owner's exchange rate), and the payment QR (for example KHQR) printed on the invoice.
 * Prices themselves are still typed and kept in US dollars.
 */
export default function Preferences({ onSaved }: { onSaved?: (settings: RestaurantSettings) => void }) {
    const slug = useContext(ResContext);
    const fileId = useId();
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [currency, setCurrency] = useState<Currency>("USD");
    const [rate, setRate] = useState("4100");
    const [qr, setQr] = useState<string | null>(null);
    const [rateError, setRateError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        if (!slug) return;
        let current = true;
        getRestaurantSettings(slug)
            .then((s) => {
                if (!current) return;
                setCurrency(s.currency);
                setRate(String(s.khrPerUsd));
                setQr(s.paymentQrUrl);
                setLoaded(true);
            })
            .catch((e) => current && setLoadError(apiErrorMessage(e, "We couldn't load the settings.")));
        return () => {
            current = false;
        };
    }, [slug]);

    const changed = () => setStatus(null);

    async function upload(file: File | undefined) {
        if (!file) return;
        setUploading(true);
        changed();
        try {
            setQr(await uploadMenuPhoto(slug, file));
        } catch (e) {
            setStatus({ ok: false, text: apiErrorMessage(e, "We couldn't upload the QR code.") });
        } finally {
            setUploading(false);
        }
    }

    async function save() {
        if (!validRate(rate)) return setRateError(RATE_ERROR);
        setSaving(true);
        try {
            const saved = await saveRestaurantSettings(slug, { currency, khrPerUsd: Number(rate), paymentQrUrl: qr });
            setStatus({ ok: true, text: "Saved" });
            onSaved?.(saved);
        } catch (e) {
            setStatus({ ok: false, text: apiErrorMessage(e, "We couldn't save the settings.") });
        } finally {
            setSaving(false);
        }
    }

    if (loadError) return <p className="text-[var(--bad)]">{loadError}</p>;
    if (!loaded) return <p className="text-[var(--muted)]">Loading settings…</p>;

    const preview = { currency, khrPerUsd: validRate(rate) ? Number(rate) : 4100 };
    return (
        <div className="max-w-2xl space-y-6 text-[var(--ink)]">
            <div>
                <h2 className="text-xl font-bold sm:text-2xl">Preferences</h2>
                <p className="mt-1 text-sm text-[var(--body)]">How prices show on every page, and the payment QR on the printed invoice.</p>
            </div>

            <section className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-6">
                <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-semibold">Currency</legend>
                    {CURRENCIES.map((c) => (
                        <label
                            key={c.value}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${currency === c.value ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"}`}
                        >
                            <input
                                type="radio"
                                name="currency"
                                value={c.value}
                                checked={currency === c.value}
                                onChange={() => {
                                    setCurrency(c.value);
                                    changed();
                                }}
                                className="mt-1"
                            />
                            <span>
                                <span className="block font-medium">{c.label}</span>
                                <span className="block text-xs text-[var(--muted)]">{c.hint}</span>
                            </span>
                        </label>
                    ))}
                </fieldset>

                <Input
                    label="Riel per US dollar"
                    inputMode="numeric"
                    value={rate}
                    error={rateError || undefined}
                    hint="Used to show riel. Dish prices stay in US dollars."
                    onChange={(e) => {
                        setRate(e.target.value);
                        setRateError("");
                        changed();
                    }}
                />

                <p className="text-sm text-[var(--body)]">
                    A $2.50 dish shows as{" "}
                    <MoneyProvider settings={preview}>
                        <Price cents={250} className="text-[var(--ink)]" />
                    </MoneyProvider>
                </p>
            </section>

            <section className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4 sm:p-6">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <QrCode size={16} aria-hidden /> Payment QR
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                        For example your KHQR. It&apos;s printed on the invoice so guests can pay by scanning. JPG, PNG or WebP, up to 5 MB.
                    </p>
                </div>
                {qr && (
                    <div className="flex flex-wrap items-end gap-4">
                        {/* the owner's uploaded photo, served by menu-service */}
                        <img src={qr} alt="Payment QR" className="size-40 rounded border border-[var(--line)] bg-white object-contain" />
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Trash2 size={14} aria-hidden />}
                            onClick={() => {
                                setQr(null);
                                changed();
                            }}
                        >
                            Remove QR
                        </Button>
                    </div>
                )}
                <input
                    id={fileId}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => upload(e.target.files?.[0])}
                />
                <label
                    htmlFor={fileId}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-[var(--card)]"
                >
                    <Upload size={16} aria-hidden />
                    {uploading ? "Uploading…" : "Upload payment QR"}
                </label>
            </section>

            <div className="flex flex-wrap items-center gap-3">
                <Button icon={<Save size={16} aria-hidden />} loading={saving} disabled={uploading} onClick={save}>
                    Save settings
                </Button>
                {status && (
                    <p role="status" className={`text-sm ${status.ok ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>
                        {status.text}
                    </p>
                )}
            </div>
        </div>
    );
}
