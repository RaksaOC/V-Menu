/**
 * The address a table's QR code opens: <origin>/<slug>/t/<qrToken> (SEC-04). The token is the
 * table's own random link, so the code can't be guessed from the table's name, and the owner can
 * replace it. The origin defaults to the site the app runs on, so codes made on staging point to
 * staging and codes made on production point to production.
 */
export function tableUrl(slug: string, qrToken: string, origin: string = window.location.origin): string {
    return `${origin}/${encodeURIComponent(slug)}/t/${encodeURIComponent(qrToken)}`;
}
