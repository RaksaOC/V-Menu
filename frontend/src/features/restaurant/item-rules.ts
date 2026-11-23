// VM-17: the checks the Add and Edit item popups run before sending. They are the server's rules
// (CreateItemBody in @vmenu/contracts) written out again, because the browser bundle takes only
// types from the contracts (CL-05). test/owner/menu-validation.test.tsx compares the two.

export type ItemFieldErrors = Partial<Record<"name" | "price" | "image" | "categoryId", string>>;

export const ITEM_NAME_MAX = 120;

/** The reasons per field, as the server would give them; empty when the dish can be sent. */
export function checkItem({ name, price }: { name: string; price: string }): ItemFieldErrors {
    const errors: ItemFieldErrors = {};
    const trimmed = name.trim();
    if (!trimmed) errors.name = "Required";
    else if (trimmed.length > ITEM_NAME_MAX) errors.name = `At most ${ITEM_NAME_MAX} characters`;
    if (!price.trim()) errors.price = "Required";
    else if (!Number.isFinite(Number(price))) errors.price = "Must be a number";
    else if (Number(price) < 0) errors.price = "Must be 0 or more";
    return errors;
}
