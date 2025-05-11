const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    table: String,
    orders: [],
    isDone: Boolean
})

const order = mongoose.model("Order", orderSchema);

module.exports = order;