import OrderCard from "./OrderCard.jsx";

export default function Orders() {
    const sampleOrders = [
        {
            id: 1,
            name: "Margherita Pizza",
            image: "/images/pizza.jpg",
            quantity: 2,
            price: 9.99,
        },
        {
            id: 2,
            name: "Coke",
            image: "/images/coke.jpg",
            quantity: 3,
            price: 1.5,
        }
    ];

    const handleMarkPaid = (orderId) => {
        console.log("Order marked as paid:", orderId);
    };

    return (
        <div className="p-4 flex justify-center items-center">
            <OrderCard
                orderId="ORD12345"
                table="7"
                orders={sampleOrders}
                onMarkPaid={handleMarkPaid}
            />
        </div>
    );
}

