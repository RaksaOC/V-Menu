const Table = require("../models/table");
const Item = require("../models/item");
const Order = require("../models/order");
const TableOrder = require("../models/tableOrder");

const getOverview = async () => {
    const numOfTables = await Table.countDocuments();
    const numOfItems = await Item.countDocuments();
    const numOfOrders = await Order.countDocuments();
    const numOfPayments = await TableOrder.countDocuments({ isPaid: true });
    const numOfUnpaidOrders = await TableOrder.countDocuments({ isPaid: false });
    const numOfActiveTables = await Table.countDocuments({ isEnabled: true });

    return {
        numOfTables,
        numOfItems,
        numOfOrders,
        numOfPayments,
        numOfUnpaidOrders,
        numOfActiveTables,
    };
};

module.exports = { getOverview };
