const Order = require("../model/orderModel");

const saveOrder = async (req, res) => {
    const newOrder = new Order({
        table: req.body.table,
        orders: req.body.orders,
    });
    newOrder.save().then(result => {
        console.log(result + "has been saved");
    }).catch(error => {
        console.log(error);
    });

    return res.json(req.body);
}

module.exports = saveOrder;