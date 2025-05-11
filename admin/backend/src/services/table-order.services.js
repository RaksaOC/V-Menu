// services/tableOrdersService.js
const TableOrder = require("../models/TableOrder");

const getAllTableOrders = async () => {
    return await TableOrder.find().populate("orders").exec();
};

const markAsPaid = async (id, isPayed) => {
    const exists = await TableOrder.findById(id);
    if (!exists) return null;

    const updated = await TableOrder.findByIdAndUpdate(
        id,
        { isPayed: !isPayed },
        { new: true }
    );

    return updated;
};

const getPaidTableOrders = async () => {
    return await TableOrder.find({ isPayed: true }).populate("orders").exec();
};

module.exports = {
    getAllTableOrders,
    markAsPaid,
    getPaidTableOrders
};
