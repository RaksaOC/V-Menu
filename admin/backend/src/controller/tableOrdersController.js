const TableOrder = require("../model/table_ordersModel");
const order = require("../model/orderModel");

const getTableOrders = async (req, res) => {
    try {
        const tableOrders = await TableOrder.find().populate("orders").exec();
        return res.status(200).json(tableOrders);
    } catch (err) {
        console.log(err);
    }
}

const markTableOrderAsPayed = async (req, res) => {
    const {_id, isPayed} = req.body;
    console.log("Incoming data:", req.body);

    try {
        const exists = await TableOrder.findById(_id);
        if (!exists) {
            console.log("Item does not exist with that ID.");
            return res.status(404).json({ message: 'Item not found' });
        }

        const updated = await TableOrder.findByIdAndUpdate(
            _id,
            { isPayed },
            { new: true }
        );

        return res.status(200).json(updated);
    } catch (err) {
        console.error("Error during update:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getPaidTableOrders = async (req, res) => {
    try {
        console.log("got to getPaidTableOrders");
        const tableOrders = await TableOrder.find({ isPayed: true }).populate("orders").exec();
        console.log("Incoming data:", tableOrders);

        res.setHeader("Cache-Control", "no-store");

        if (!tableOrders || tableOrders.length === 0) {
            return res.status(404).json({ message: 'Table orders not found' });
        }

        return res.status(200).json(tableOrders);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: 'Server error' });
    }
};



module.exports = {getTableOrders, markTableOrderAsPayed, getPaidTableOrders};