function addToCart(item) {
    const allItems = JSON.parse(localStorage.getItem("cartItems")) || [];
    const existingItemIndex = allItems.findIndex(cartItem => cartItem.id === item.id)
    if (existingItemIndex !== -1) {
        allItems[existingItemIndex].quantity += 1;
    }
    else {
        allItems.push(item);
    }
    localStorage.setItem("cartItems", JSON.stringify(allItems));
    console.log(allItems);
}

function Card({id, name, price, image }) {
    return (
        <div className="max-w-[100%] rounded-2xl overflow-hidden shadow-lg bg-white hover:scale-105 transition-transform duration-300">
            <img className="w-full h-48 object-cover" src={image} alt={name} />
            <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{name}</h3>
                <p className="text-gray-600 mb-4">${price.toFixed(2)}</p>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl" onClick={() => {
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
