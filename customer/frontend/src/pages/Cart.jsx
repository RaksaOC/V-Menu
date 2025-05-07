import {useState, useEffect} from "react";
import {Link} from "react-router";
import {toast} from "react-toastify";
import axios from "axios";

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
        if (!cartItems.length) {
            toast.error("No items in cart!", {
                position: "top-center",  // mobile-friendly placement
                autoClose: 1000,            // close after 2 seconds
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: false,
                theme: "light",             // you can also use "dark" if you prefer
            });
            return;
        }
        axios.post("http://localhost:3000/order", {
            table: `${localStorage.getItem("tableId")}`,
            orders: cartItems
        }).then((res) => {
            if (!res.ok) {
                console.log("An Error occured");
            }
            console.log(res);
        });

        toast.success("Order has been placed!", {
            position: "top-center",  // mobile-friendly placement
            autoClose: 1000,            // close after 2 seconds
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: false,
            theme: "light",             // you can also use "dark" if you prefer
        });
        setTimeout(() => {
            setCartItems([]);
            localStorage.removeItem("cartItems");
            window.location.href = `/items/${localStorage.getItem("tableId")}`;
        }, 1000);



    }

    return (
        <div className="relative min-h-screen p-4 pb-32 bg-gray-100 flex flex-col justify-start items-center">
            <div className={"header-wrapper w-full"}>
                <div className="header justify-between flex flex-row w-full items-center md:max-w-[50%]">
                    <Link
                        to={`/items/${localStorage.getItem("tableId")}`}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl h-[40px]"
                    >
                        Go Back
                    </Link>
                    <h1 className="text-2xl font-bold text-center mb-0">Your Cart</h1>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-[98%] mt-14">
                {
                    cartItems.length > 0 ?
                        cartItems.map((item, index) => (
                                <div key={index}
                                     className="bg-white rounded-xl shadow-md flex items-center p-4 gap-4 flex-wrap justify-center md:justify-between">
                                    <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg"/>
                                    <div className="flex-1 min-w-1/4">
                                        <h2 className="font-semibold text-s">{item.name}</h2>
                                        <p className="text-gray-600">${(item.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={() => decreaseQuantity(index)}
                                            className="bg-gray-300 hover:bg-gray-400 text-black text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center"
                                        >
                                            -
                                        </button>

                                        <span className="font-semibold text-base w-6 text-center">{item.quantity}</span>

                                        <button
                                            onClick={() => increaseQuantity(index)}
                                            className="bg-gray-300 hover:bg-gray-400 text-black text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center"
                                        >
                                            +
                                        </button>

                                        <button
                                            onClick={() => removeItem(index)}
                                            className="ml-2 w-6 h-6 flex items-center justify-center cursor-pointer"
                                        >
                                            <img src="/src/assets/delete.svg" alt="Delete" className="w-5 h-5 invert"/>
                                        </button>
                                    </div>
                                </div>
                            )
                        )
                        :
                        <h1 className={"mt-[40vh] text-4xl text-center"}>Cart is Empty</h1>
                }

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
