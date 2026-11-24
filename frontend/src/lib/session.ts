// VM-03: what happens when a staff member's sign-in ends (the API answers 401).

/** Wrapped so tests can watch navigation; jsdom can't change pages. */
export const navigation = { to: (url: string) => window.location.assign(url) };

/** The login page for the role whose page this is, or null on customer and public pages. */
export function loginPathFor(path: string): string | null {
    const staff = /^\/([^/]+)\/(kitchen|cashier)(\/|$)/.exec(path);
    if (staff) return `/${staff[1]}/${staff[2]}/login`;
    if (/^\/owner(\/|$)/.test(path)) return "/owner/login";
    return null;
}

/** Forgets the token and opens the role's login page, which then says the session ended. */
export function endSession(): void {
    const login = loginPathFor(window.location.pathname);
    if (!login || window.location.pathname === login) return; // customers, or already signing in
    localStorage.removeItem("token");
    navigation.to(`${login}?expired=1`);
}
