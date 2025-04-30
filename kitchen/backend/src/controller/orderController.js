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

const markOrderAsDone = async (req, res) => {
    try {
        const { _id, isDone } = req.body;

        const updatedItem = await Order.findByIdAndUpdate(
            _id,
            { isDone: isDone },
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.status(200).json(updatedItem);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = {getOrders, markOrderAsDone};
