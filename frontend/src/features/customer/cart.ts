import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CartItem } from "@/lib/types/CartItem";

// The customer's cart, kept in localStorage until the order is placed.
export function addToCart(itemToAdd: CartItem): void {
    // Get existing items or fallback to empty array
    const storedCartItems = localStorage.getItem("cartItems");
    const allCartItems: CartItem[] = storedCartItems ? JSON.parse(storedCartItems) : [];

    // Check if item exists
    const existingItemIndex = allCartItems.findIndex(cartItem => cartItem.item._id === itemToAdd.item._id);

    if (existingItemIndex !== -1) {
        // Increment quantity
        allCartItems[existingItemIndex].quantity += 1;

        toast.success("Added to existing item!", {
            position: "top-center",
            autoClose: 1500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
            progressClassName: "!bg-gradient-to-r !from-emerald-500 !to-green-500",
        });
    } else {
        allCartItems.push(itemToAdd);

        toast.success("Added to cart! 🛒", {
            position: "top-center",
            autoClose: 1500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            className: "!bg-white !text-gray-800 !shadow-xl !border !border-gray-100",
            progressClassName: "!bg-gradient-to-r !from-emerald-500 !to-green-500",
        });
    }

    // Save updated items
    localStorage.setItem("cartItems", JSON.stringify(allCartItems));
    console.log(allCartItems);
}
