const Order = require("../model/orderModel");
const TableOrder = require("../model/table_ordersModel");

const saveOrder = async (req, res) => {
    try {
        const orderToSave = {
            table: req.body.table,
            orders: req.body.orders,
            isDone: false
        };

        // 1. Save to orders collection
        const newOrder = await new Order(orderToSave).save();
        console.log("New order saved:", newOrder);

        // 2. Find existing TableOrder (same table and not paid)
        const existingTableOrder = await TableOrder.findOne({
            table: orderToSave.table,
            isPayed: false
        });

        if (existingTableOrder) {
            // 3. Append the new order's _id to the orders array
            existingTableOrder.orders.push(newOrder._id);
            await existingTableOrder.save();
            console.log("Updated existing TableOrder");
        } else {
            // 4. If no such TableOrder exists, create a new one
            const newTableOrder = new TableOrder({
                table: orderToSave.table,
                orders: [newOrder._id],
                isPayed: false
            });
            await newTableOrder.save();
            console.log("Created new TableOrder");
        }

        return res.status(200).json({message: "Order and tableOrder updated."});

    } catch (err) {
        console.error("Error saving order:", err);
        return res.status(500).json({message: "Internal server error."});
    }
};

module.exports = saveOrder;