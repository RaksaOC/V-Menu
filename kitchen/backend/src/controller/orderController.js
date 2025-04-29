const Order = require("../model/orderModel");

const getOrders = async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        console.log(err);
        res.status(500).send({});
    }
};

module.exports = getOrders;
