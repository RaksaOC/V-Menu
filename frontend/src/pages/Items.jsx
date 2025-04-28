import axios from "axios";
import Card from "../components/Card";
import { useEffect, useState } from "react";
import { Link } from "react-router";

function Items() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        async function getItems() {
            try {
                const response = await axios.get('http://localhost:3000/items/');
                setItems(response.data);
            } catch (err) {
                console.log(err);
            }
        }

        getItems();
    }, []);

    return (
        <>
            <header className="header p-2.5">
                <p className={"text-center text-black text-3xl"}>LOGO</p>
            </header>
            <div className="items-wrapper max-w-[1024px] mx-auto p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-24">
                {items.map(item => (
                    <Card key={item._id} id={item._id} name={item.name} image={item.image} price={item.price}/>
                ))}
            </div>

            {/* Bottom fixed cart bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 flex items-center justify-between p-4">
                <img className="w-8 invert" src="src/assets/cart.svg" alt="Cart" />
                <Link to="/cart" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl">
                    View Cart
                </Link>
            </div>
        </>
    )
}

export default Items;
