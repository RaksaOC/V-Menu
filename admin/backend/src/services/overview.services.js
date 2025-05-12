const Table = require("../models/table");
const Item = require("../models/item");
const Order = require("../models/order");
const TableOrder = require("../models/tableOrder");

const getOverview =async () => {
    const numOfTables = await Table.countDocuments();
    const numOfItems = await Item.countDocuments();
    const numOfOrders = await Order.countDocuments();
    const numOfPayments = await TableOrder.find({isPaid: true}).length;
    const numOfUnpaidOrders = await TableOrder.find({isPaid: false}).length;
    const numOfActiveTables = await Table.find({isEnabled: true}).length;
    return {
        numOfTables,
        numOfItems,
        numOfOrders,
        numOfPayments,
        numOfUnpaidOrders,
        numOfActiveTables,
    }
};

module.exports = {getOverview}