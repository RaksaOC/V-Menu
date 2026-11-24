// SEC-02: the security headers every web page sends (next.config.ts adds them). The API under
// /api/* gets its own from Helmet in each service, so it's left out.

export type CspMode = "report-only" | "enforce";

interface PolicyOptions {
    /** next dev: React needs eval for its error overlay, and hot reload uses a websocket */
    dev: boolean;
    /** Google Analytics is on (production builds with a measurement ID) */
    analytics: boolean;
    /** B6: e2e builds sign in against the Firebase Auth emulator at this URL */
    authEmulator?: string | null;
    /** PHOTOS-S3: object storage's public address (S3_PUBLIC_URL); only its origin is used */
    storage?: string | null;
}

/** The http(s) origin of a URL, or null for anything else. */
function originOf(url: string | null | undefined): string | null {
    if (!url || !URL.canParse(url)) return null;
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
}

/**
 * Only what the app uses:
 * - Firebase Auth calls *.googleapis.com and may open a frame on <project>.firebaseapp.com.
 * - Images: our own (uploaded photos, VM-02), data: and blob: (QR codes, photo previews) and
 *   images.unsplash.com for the demo seed's photos.
 * - PHOTOS-S3: object storage, when configured: the owner's browser posts photos to it
 *   (connect-src), and photo links redirect to it (img-src).
 * - Next and the theme script (layout.tsx) need inline scripts until we move to nonces.
 */
export function contentSecurityPolicy({ dev, analytics, authEmulator, storage }: PolicyOptions): string {
    const ga = analytics;
    const files = originOf(storage);
    const policy: Record<string, string[]> = {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...(ga ? ["https://www.googletagmanager.com"] : [])],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": [
            "'self'",
            "data:",
            "blob:",
            "https://images.unsplash.com",
            ...(files ? [files] : []),
            ...(ga ? ["https://*.google-analytics.com", "https://*.googletagmanager.com"] : []),
        ],
        "font-src": ["'self'", "data:"],
        "connect-src": [
            "'self'",
            "https://*.googleapis.com",
            ...(ga ? ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"] : []),
            ...(dev ? ["ws:"] : []),
            ...(authEmulator ? [authEmulator] : []),
            ...(files ? [files] : []),
        ],
        "frame-src": ["https://*.firebaseapp.com"],
        "worker-src": ["'self'", "blob:"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
    };
    return Object.entries(policy)
        .map(([name, values]) => `${name} ${values.join(" ")}`)
        .join("; ");
}

export function securityHeaders({ mode, ...policy }: PolicyOptions & { mode: CspMode }) {
    return [
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Frame-Options", value: "DENY" },
        {
            // Report-only first: the browser logs what it would block, and blocks nothing.
            key: mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy(policy),
        },
    ];
}
