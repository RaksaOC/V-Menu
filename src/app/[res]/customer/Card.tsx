import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css'; // important to import the styles
import {Item} from "@/app/[res]/types/Item";

export function addToCart(item: Item): void {
    // Get existing items or fallback to empty array
    const storedItems = localStorage.getItem("cartItems");
    const allItems: Item[] = storedItems ? JSON.parse(storedItems) : [];

    // Check if item exists
    const existingItemIndex = allItems.findIndex(cartItem => cartItem.id === item.id);

    if (existingItemIndex !== -1) {
        // Increment quantity
        allItems[existingItemIndex].quantity += 1;

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
        allItems.push(item);

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
    localStorage.setItem("cartItems", JSON.stringify(allItems));
    console.log(allItems);
}

interface CardProps {
    id: string;
    name: string;
    price: number;
    image: string;
}

function Card({id, name, price, image }:CardProps) {
    return (
        <div className="max-w-[100%] rounded-2xl overflow-hidden shadow-lg bg-white hover:scale-105 transition-transform duration-300">
            <img className="w-full h-48 object-cover" src={image} alt={name} />
            <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{name}</h3>
                <p className="text-gray-600 mb-4">${price.toFixed(2)}</p>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer" onClick={() => {
                    const item = {
                        id: id,
                        image: image,
                        name: name,
                        quantity: 1,
                        price: price.toFixed(2),
                    }
                    addToCart(item);
                }}>
                    Add to Cart
                </button>
            </div>
        </div>
    );
}

export default Card;
