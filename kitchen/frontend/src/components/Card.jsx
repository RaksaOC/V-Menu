

function Card({orderId, table, orders, onDone}) {
    return (

        <div className="max-w-[1024px] w-[98%] rounded-2xl overflow-hidden shadow-lg bg-white p-4 my-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-gray-800">Table {table}</h3>
                <span className="text-sm text-gray-500">Order ID: {orderId}</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4">
                {orders.map((item) => (
                    <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 border-b last:border-none py-2"
                    >
                        <div className="flex items-center gap-3">
                            <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 object-cover rounded"
                            />
                            <span className="text-gray-800">{item.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">x{item.quantity}</p>
                    </div>
                ))}
            </div>

            <button
                onClick={() => {
                    onDone(orderId)
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl transition duration-200 cursor-pointer"
            >
                Mark as Done
            </button>
        </div>

    );
}

export default Card;
