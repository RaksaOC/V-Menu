const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    table: String,
    orders: [],
    isDone: Boolean,
})

const order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = order;