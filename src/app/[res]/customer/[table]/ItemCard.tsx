import {toast} from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'; // important to import the styles
import {ItemInput, ItemOutput} from "@/app/shared/types/Item";
import {CartItem} from "@/app/shared/types/CartItem";

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
            autoClose: 1000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "light",
        });
    } else {
        allCartItems.push(itemToAdd);

        toast.success("Added to cart!", {
            position: "top-center",
            autoClose: 1000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "light",
        });
    }

    // Save updated items
    localStorage.setItem("cartItems", JSON.stringify(allCartItems));
    console.log(allCartItems);
}

interface CardProps {
    _id: string;
    name: string;
    price: number;
    image: string;
}

export default function Card({ _id, name, price, image }: CardProps) {
    return (
        <div className="w-full md:w-[100%] lg:w-[100%] bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
            <img
                src={image}
                alt={name}
                className="w-full h-44 object-cover"
            />

            <div className="p-4 flex flex-col justify-between h-[160px]">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 truncate">{name}</h3>
                    <p className="text-sm text-gray-500 mt-1">${price.toFixed(2)}</p>
                </div>

                <button
                    onClick={() => {
                        const item: ItemOutput = {
                            _id,
                            image,
                            name,
                            price: parseInt(price.toFixed(2)),
                            isEnabled: true,
                        };

                        const cartItem = {
                            item,
                            quantity: 1,
                        };

                        addToCart(cartItem);
                    }}
                    className="mt-4 bg-green-500 hover:bg-green-600 text-white font-medium py-2 rounded-lg transition-colors"
                >
                    Add to Cart
                </button>
            </div>
        </div>
    );
}
