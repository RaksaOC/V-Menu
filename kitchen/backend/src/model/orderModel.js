const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    table: String,
    orders: [],
})

const order = mongoose.model("Order", orderSchema);

module.exports = order;