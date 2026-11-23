/**
 * The address a table's QR code opens: <origin>/<slug>/customer/<table>.
 * The origin defaults to the site the app runs on, so codes made on staging point to staging
 * and codes made on production point to production.
 */
export function tableUrl(slug: string, tableName: string, origin: string = window.location.origin): string {
    return `${origin}/${encodeURIComponent(slug)}/customer/${encodeURIComponent(tableName)}`;
}
