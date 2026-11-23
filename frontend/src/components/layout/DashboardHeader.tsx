"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Clock, LogOut, Menu as MenuIcon, MonitorX, User, UtensilsCrossed } from "lucide-react";
import { navigation, signOut } from "@/lib/session";
import { signOutEverywhere } from "@/lib/sign-out-everywhere";
import { toast } from "@/lib/toast";

interface Props {
    /** e.g. "V-Menu Owner", "V-Menu Cashier" */
    title: string;
    subtitle?: string;
    /** Shown on the account button: "Owner", "Cashier" */
    roleLabel: string;
    email: string;
    /** Where Sign Out goes */
    loginHref: string;
    /** The cashier shows the time, for the till */
    clock?: boolean;
    position?: "fixed" | "sticky";
    /** Shows a menu button on small screens, e.g. for the owner's sidebar */
    onOpenMenu?: () => void;
}

/** One header for the staff dashboards, by props (CL-09; was an owner and a cashier copy). */
export default function DashboardHeader({
    title,
    subtitle,
    roleLabel,
    email,
    loginHref,
    clock = false,
    position = "sticky",
    onOpenMenu,
}: Props) {
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        if (!clock) return;
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, [clock]);

    async function endAllSessions() {
        if (await signOutEverywhere()) navigation.to(loginHref);
        else toast.error("Couldn't sign out everywhere. Try again.");
    }

    return (
        <header
            className={`${position === "fixed" ? "fixed" : "sticky"} left-0 right-0 top-0 z-30 flex w-full items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--bg)] p-4 text-[var(--ink)]`}
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-[var(--r-chip)] bg-[var(--accent-soft)] p-2.5 text-[var(--accent-text)]">
                    <UtensilsCrossed size={22} aria-hidden />
                </span>
                <div className="min-w-0">
                    <h1 className="truncate text-lg font-bold">{title}</h1>
                    {subtitle && <p className="truncate text-xs text-[var(--muted)]">{subtitle}</p>}
                </div>
            </div>

            {clock && now && (
                <div className="hidden items-center gap-3 rounded-[var(--r-chip)] border border-[var(--line)] px-4 py-2 md:flex">
                    <Clock size={16} aria-hidden className="text-[var(--accent-text)]" />
                    <div className="text-center">
                        <div className="font-mono text-sm font-semibold">
                            {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                            {now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <Menu as="div" className="relative">
                    <MenuButton className="flex items-center gap-3 rounded-[var(--r-chip)] border border-[var(--line)] px-3 py-2 hover:bg-[var(--card)]">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                            <User size={16} aria-hidden />
                        </span>
                        <span className="hidden text-left sm:block">
                            <span className="block text-sm font-medium">{roleLabel}</span>
                            <span className="block max-w-32 truncate text-xs text-[var(--muted)]">{email}</span>
                        </span>
                    </MenuButton>
                    <MenuItems className="absolute right-0 z-40 mt-2 w-56 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--bg)] py-2 shadow-[var(--pop)] focus:outline-none">
                        <div className="border-b border-[var(--line)] px-4 py-3">
                            <p className="text-sm font-medium">Signed in as</p>
                            <p className="truncate text-sm text-[var(--muted)]">{email}</p>
                        </div>
                        <MenuItem>
                            <Link
                                href={loginHref}
                                onClick={() => void signOut()}
                                className="mt-1 flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--bad)] data-[focus]:bg-[var(--bad-soft)]"
                            >
                                <LogOut size={16} aria-hidden /> Sign Out
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <button
                                type="button"
                                onClick={() => void endAllSessions()}
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[var(--bad)] data-[focus]:bg-[var(--bad-soft)]"
                            >
                                <MonitorX size={16} aria-hidden /> Sign out everywhere
                            </button>
                        </MenuItem>
                    </MenuItems>
                </Menu>
                {onOpenMenu && (
                    <button
                        type="button"
                        aria-label="Open the menu"
                        onClick={onOpenMenu}
                        className="rounded-[var(--r-chip)] p-2 hover:bg-[var(--card)] lg:hidden"
                    >
                        <MenuIcon size={22} aria-hidden />
                    </button>
                )}
            </div>
        </header>
    );
}
