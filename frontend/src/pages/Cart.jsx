import {useState, useEffect} from "react";
import {Link} from "react-router";

export default function Cart() {
    const [cartItems, setCartItems] = useState([]);

    useEffect(() => {
        const storedItems = JSON.parse(localStorage.getItem("cartItems")) || [];
        setCartItems(storedItems);
    }, []);

    function increaseQuantity(index) {
        const updatedItems = [...cartItems];
        updatedItems[index].quantity += 1;
        setCartItems(updatedItems);
        localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    }

    function decreaseQuantity(index) {
        const updatedItems = [...cartItems];
        if (updatedItems[index].quantity > 1) {
            updatedItems[index].quantity -= 1;
            setCartItems(updatedItems);
            localStorage.setItem("cartItems", JSON.stringify(updatedItems));
        }
    }

    function removeItem(index) {
        const updatedItems = [...cartItems];
        updatedItems.splice(index, 1);
        setCartItems(updatedItems);
        localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    }

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    function placeOrder() {
        alert('Order placed successfully!');
        setCartItems([]);
        localStorage.removeItem("cartItems");
    }

    return (
        <div className="relative min-h-screen p-4 pb-32 bg-gray-100 flex flex-col justify-start items-center">
            <div className={"header-wrapper w-full"}>
                <div className="header justify-between flex flex-row w-full w-full items-center md:max-w-[50%]">
                    <Link
                        to={"/"}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl h-[40px]"
                    >
                        Go Back
                    </Link>
                    <h1 className="text-2xl font-bold text-center mb-0">Your Cart</h1>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-[98%] mt-14">
                {cartItems.map((item, index) => (
                    <div key={index}
                         className="bg-white rounded-xl shadow-md flex items-center p-4 gap-4 flex-wrap justify-center md:justify-between">
                        <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg"/>
                        <div className="flex-1">
                            <h2 className="font-semibold text-lg">{item.name}</h2>
                            <p className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => decreaseQuantity(index)}
                                className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-1 px-3 rounded"
                            >
                                -
                            </button>
                            <span className="font-semibold">{item.quantity}</span>
                            <button
                                onClick={() => increaseQuantity(index)}
                                className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-1 px-3 rounded"
                            >
                                +
                            </button>
                            <button
                                onClick={() => removeItem(index)}
                                className="text-red-500 hover:text-red-700 font-bold ml-2"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Fixed bottom bar */}
            <div
                className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 flex items-center justify-between p-4">
                <div className="text-lg font-bold">
                    Total: ${total.toFixed(2)}
                </div>
                <button
                    onClick={placeOrder}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl"
                >
                    Place Order
                </button>
            </div>
        </div>
    );
}
