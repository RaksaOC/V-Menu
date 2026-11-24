import { Minus, Plus, Trash2 } from "lucide-react";
import type { MenuItem } from "@vmenu/contracts";
import { useMoney } from "@/components/money/MoneyProvider";
import { LINE_NOTE_MAX, type CartItem } from "@/features/customer/cart";

type CartItemProps = {
    cartItem: CartItem;
    index: number;
    increaseQuantity: (index: number) => void;
    decreaseQuantity: (index: number) => void;
    removeItem: (index: number) => void;
    /** VM-28: the customer's note on this line */
    setNote: (index: number, note: string) => void;
};

// VM-33: 44 px touch targets
const stepper =
    "flex min-h-11 min-w-11 items-center justify-center rounded-[var(--r-chip)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-40";

/** One line of the cart (VM-33): a plain row with the dish, its price, a quantity stepper and its note. */
const CartItemCard = ({ cartItem, index, increaseQuantity, decreaseQuantity, removeItem, setNote }: CartItemProps) => {
    const money = useMoney(); // VM-24: prices in the restaurant's currency
    const menuItem: Pick<MenuItem, "name" | "image" | "priceCents"> = cartItem.item;
    const { name } = menuItem;

    return (
        <li className="py-4">
            <div className="flex flex-wrap items-center gap-3">
                <img src={menuItem.image} alt={name} loading="lazy" className="h-14 w-14 shrink-0 rounded-[var(--r-chip)] object-cover" />
                <div className="min-w-[10rem] flex-1">
                    <h3 className="break-words font-semibold leading-snug text-[var(--ink)] line-clamp-2">{name}</h3>
                    <p className="font-[family-name:var(--f-mono)] text-sm text-[var(--muted)]">{money(menuItem.priceCents)} each</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <button
                        type="button"
                        aria-label={`Decrease ${name}`}
                        disabled={cartItem.quantity <= 1}
                        onClick={() => decreaseQuantity(index)}
                        className={stepper}
                    >
                        <Minus size={16} aria-hidden />
                    </button>
                    <span className="w-8 text-center font-[family-name:var(--f-mono)] font-semibold">{cartItem.quantity}</span>
                    <button type="button" aria-label={`Increase ${name}`} onClick={() => increaseQuantity(index)} className={stepper}>
                        <Plus size={16} aria-hidden />
                    </button>
                    <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => removeItem(index)}
                        className={`${stepper} ml-1 text-[var(--bad)]`}
                    >
                        <Trash2 size={16} aria-hidden />
                    </button>
                </div>
            </div>
            {/* VM-28: "no chilli": the kitchen sees it under the dish */}
            <input
                type="text"
                aria-label={`Note for ${name}`}
                maxLength={LINE_NOTE_MAX}
                value={cartItem.note ?? ""}
                onChange={(e) => setNote(index, e.target.value)}
                placeholder="Add a note, e.g. no chilli"
                className="mt-3 min-h-11 w-full rounded-[var(--r-in)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-mid)]"
            />
        </li>
    );
};

export default CartItemCard;
