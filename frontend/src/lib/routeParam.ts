/**
 * A route segment as the user sees it (VM-01). Next 15 hands useParams() the segment still
 * URL-encoded, so a QR code for "Patio 2" arrives as "Patio%202". This decodes it once; a value
 * that isn't valid encoding (a bare "%") is kept as it is.
 */
export function routeParam(value: string | string[] | undefined): string {
    const raw = Array.isArray(value) ? value.join("/") : (value ?? "");
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}
