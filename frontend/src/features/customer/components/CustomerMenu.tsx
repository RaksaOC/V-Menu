"use client";

import ItemCard from "@/features/customer/components/ItemCard";
import { useCallback, useEffect, useState } from "react";
import { ToastHost } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { apiErrorCode } from "@/lib/api";
import { useRestaurantName } from "@/lib/public-restaurant";
import TableProblem, { type TableProblemKind } from "@/features/customer/components/TableProblem";
import { checkTable, getMenu, getTableByToken } from "@/features/customer/api";
import { useTableLink } from "@/features/customer/table-link";
import { reconcileCart } from "@/features/customer/cart";
import { orderableDishes, searchMenu, sectionId } from "@/features/customer/menu";
import { toast } from "@/lib/toast";
import type { MenuSection } from "@vmenu/contracts";
import MenuCartBar from "./menu/MenuCartBar";
import MenuHeader from "./menu/MenuHeader";
import MenuToolbar from "./menu/MenuToolbar";
import NoDishes from "./menu/NoDishes";

// VM-04: what the page says for each error code
const PROBLEMS: Record<string, TableProblemKind> = {
    TABLE_CLOSED: "closed",
    RESTAURANT_NOT_FOUND: "no-restaurant",
    TABLE_NOT_FOUND: "no-table",
    TABLE_LINK_INVALID: "invalid-link",
};
const problemFor = (code: string | undefined): TableProblemKind => (code && PROBLEMS[code]) || "error";

export default function CustomerPage() {
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [query, setQuery] = useState("");
    const [current, setCurrent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [problem, setProblem] = useState<TableProblemKind | null>(null);
    const link = useTableLink();
    const { slug: resSlug, token, cartId } = link;
    // SEC-04: with a link token, the server says which table it is
    const [table, setTable] = useState(link.name);
    // VM-21: the real name. While it loads the heading keeps its space; the slug is never shown.
    const restaurantName = useRestaurantName(resSlug);
    const heading = restaurantName ?? "Menu";

    useEffect(() => {
        if (restaurantName !== undefined && table) document.title = `${heading} · Table ${table}`;
    }, [restaurantName, heading, table]);

    // VM-04: check the table, then load the menu. Every failure is explained on this page
    // (closed table, unknown restaurant or table, or a server error with Try again).
    const load = useCallback(async () => {
        setIsLoading(true);
        setProblem(null);
        try {
            if (token) {
                const found = await getTableByToken(resSlug, token);
                setTable(found.table);
                if (!found.isOpen) return setProblem("closed");
            } else await checkTable(resSlug, link.name);
            const menu = await getMenu(resSlug);
            setSections(menu.categories);
            // VM-05: dishes taken off the menu since they were added leave the cart.
            const dropped = reconcileCart(resSlug, cartId, orderableDishes(menu));
            if (dropped)
                toast.info(
                    `${dropped} ${dropped === 1 ? "item is" : "items are"} no longer available and ${dropped === 1 ? "was" : "were"} removed from your cart.`,
                );
        } catch (error) {
            setProblem(problemFor(apiErrorCode(error)));
        } finally {
            setIsLoading(false);
        }
    }, [resSlug, token, link.name, cartId]);

    useEffect(() => {
        load();
    }, [load]);

    // VM-25: the search box narrows the sections; a tab scrolls to its section.
    const shown = searchMenu(sections, query);
    function goTo(section: MenuSection) {
        setCurrent(sectionId(section));
        document.getElementById(sectionId(section))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const card = (item: MenuSection["items"][number]) => (
        <ItemCard
            key={item._id}
            slug={resSlug}
            table={cartId}
            _id={item._id}
            name={item.name}
            image={item.image}
            priceCents={item.priceCents}
            description={item.description}
            tags={item.tags}
            soldOut={!item.isEnabled}
        />
    );

    return (
        <>
            <ToastHost />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <MenuHeader heading={heading} nameLoaded={restaurantName !== undefined} table={table} link={link} />

                {!problem && !isLoading && sections.length > 0 && (
                    <MenuToolbar query={query} onQuery={setQuery} shown={shown} current={current} goTo={goTo} />
                )}

                {/* Main Content */}
                <main className="px-4 sm:px-6 py-8 pb-24">
                    <div className="max-w-6xl mx-auto">
                        {/* Section Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Our Menu</h2>
                            <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
                        </div>

                        {problem ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                <TableProblem kind={problem} table={table} onRetry={load} />
                            </div>
                        ) : isLoading ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                <Skeleton variant="menu" count={3} className="contents" />
                            </div>
                        ) : shown.length > 0 ? (
                            <div className="space-y-10">
                                {shown.map((section) => (
                                    <section
                                        key={sectionId(section)}
                                        id={sectionId(section)}
                                        aria-labelledby={`${sectionId(section)}-title`}
                                        className="scroll-mt-36"
                                    >
                                        <h3 id={`${sectionId(section)}-title`} className="mb-4 text-lg font-semibold text-gray-800">
                                            {section.name}
                                        </h3>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                            {section.items.map(card)}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : query.trim() ? (
                            <p className="py-12 text-center text-gray-500">No dishes match “{query.trim()}”.</p>
                        ) : (
                            <NoDishes />
                        )}
                    </div>
                </main>

                {/* the cart bar, hidden while the table can't take orders */}
                {!problem && <MenuCartBar cartHref={`${link.base}/cart`} />}
            </div>
        </>
    );
}
