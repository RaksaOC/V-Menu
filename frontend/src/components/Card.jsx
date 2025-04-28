function Card({ name, price, image }) {
    return (
        <div className="max-w-[100%] rounded-2xl overflow-hidden shadow-lg bg-white hover:scale-105 transition-transform duration-300">
            <img className="w-full h-48 object-cover" src={image} alt={name} />
            <div className="p-4">
                <h2 className="text-xl font-bold text-gray-800 mb-2">{name}</h2>
                <p className="text-gray-600 mb-4">${price.toFixed(2)}</p>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl">
                    Add to Cart
                </button>
            </div>
        </div>
    );
}

export default Card;
