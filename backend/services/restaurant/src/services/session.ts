// VM-03: a sign-in lasts a whole shift (12 hours unless SESSION_HOURS says otherwise, 1 to 24),
// so a kitchen screen doesn't silently stop after an hour. The cookie lasts exactly as long.
export function sessionHours(): number {
    const h = Number(process.env.SESSION_HOURS ?? 12);
    return Number.isFinite(h) && h >= 1 && h <= 24 ? h : 12;
}
