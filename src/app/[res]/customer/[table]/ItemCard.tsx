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

function Card({_id, name, price, image}: CardProps) {
    return (
        <div
            className="max-w-[100%] rounded-2xl overflow-hidden shadow-lg bg-white hover:scale-105 transition-transform duration-300">
            <img className="w-full h-48 object-cover" src={image} alt={name}/>
            <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{name}</h3>
                <p className="text-gray-600 mb-4">${price.toFixed(2)}</p>
                <button
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl cursor-pointer"
                    onClick={() => {
                        const item: ItemOutput = {
                            _id: _id,
                            image: image,
                            name: name,
                            price: parseInt(price.toFixed(2)),
                            isEnabled: true,
                        }

                        const cartItem = {
                            item: item,
                            quantity: 1,
                        }

                        addToCart(cartItem);
                    }}>
                    Add to Cart
                </button>
            </div>
        </div>
    );
}

export default Card;
