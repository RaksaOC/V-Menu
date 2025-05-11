import axios from "axios";
import Card from "../components/Card";
import {useEffect, useState} from "react";
import {Link} from "react-router";
import SkeletonCards from "../components/SkeletonCards.jsx";

function Items() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function getItems() {
            try {
                const response = await axios.get(`http://localhost:3000/api/items`);
                const data = await response.data;
                setItems(data.filter(d => d.isAvailable === true));
            } catch (err) {
                console.log(err);
            } finally {
                setLoading(false);
            }
        }

        getItems();
    }, []);

    return (
        <>
            <header className="header p-2.5">
                <p className="text-center text-black text-3xl">V-Menu Customer</p>
            </header>

            <div className="items-wrapper max-w-[1024px] mx-auto p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-24">
                {loading ? (
                    <SkeletonCards></SkeletonCards>
                ) : items.length > 0 ? (
                    items.map(item => (
                        <Card key={item._id} id={item._id} name={item.name} image={item.image} price={item.price}/>
                    ))
                ) : (
                    <p className="col-span-full text-center text-gray-400 text-md mt-24">
                        No items to display.
                    </p>
                )}
            </div>

            {/* Bottom fixed cart bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-300 flex items-center justify-between p-4">
                <img className="w-8 invert" src="/src/assets/cart.svg" alt="Cart"/>
                <Link to="/cart">
                    <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-xl">
                        View Cart
                    </button>
                </Link>
            </div>
        </>
    );
}

export default Items;
