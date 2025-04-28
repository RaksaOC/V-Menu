import axios from "axios";
import Card from "../components/Card";
import {useEffect, useState} from "react";



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
        <div className="items-wrapper max-w-[1024px] mx-auto p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {items.map(item => (
                <Card key={item._id} name={item.name} image={item.image} price={item.price} />
            ))}
        </div>
    )
}

export default Items;
