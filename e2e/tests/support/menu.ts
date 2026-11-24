// VM-25: the public menu is grouped by category. Older backends answered with a flat list of
// dishes; these helpers read either, so a spec doesn't care which one it is talking to.
export interface Dish {
    _id: string;
    name: string;
    price: number;
    isEnabled?: boolean;
}
type Menu = Dish[] | { categories: { _id: string | null; name: string; items: Dish[] }[] };

/** Every dish that can be ordered, in one list. VM-26: sold-out dishes are on the menu, but not here. */
export const dishesOf = (menu: Menu): Dish[] =>
    (Array.isArray(menu) ? menu : menu.categories.flatMap((c) => c.items)).filter((dish) => dish.isEnabled !== false);

/** The same menu without the dishes `keep` rejects, in the same shape. */
export function withoutDishes(menu: Menu, keep: (dish: Dish) => boolean): Menu {
    if (Array.isArray(menu)) return menu.filter(keep);
    return { categories: menu.categories.map((c) => ({ ...c, items: c.items.filter(keep) })).filter((c) => c.items.length > 0) };
}
