import type { MenuItem, MenuSection, PublicMenu } from "@vmenu/contracts";

// VM-25: the customer's menu comes in sections (one per category, "Other" last).

/** The dishes that can be ordered, in one list (the cart checks against this, VM-05).
 *  VM-26: sold-out dishes are on the menu, but not here, so they leave the cart. */
export const orderableDishes = (menu: PublicMenu): MenuItem[] =>
    menu.categories.flatMap((section) => section.items).filter((item) => item.isEnabled);

/** The page anchor of a section; "Other" has no id. */
export const sectionId = (section: MenuSection) => `menu-${section._id ?? "other"}`;

/** The sections with only the dishes whose name contains `query` (any case); empty sections are left out. */
export function searchMenu(sections: MenuSection[], query: string): MenuSection[] {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
        .map((section) => ({ ...section, items: section.items.filter((item) => item.name.toLowerCase().includes(q)) }))
        .filter((section) => section.items.length > 0);
}
