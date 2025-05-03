const mongoose = require("mongoose");
const Order = require("../model/orderModel");

const TableOrderSchema = new mongoose.Schema({
    table: {
        type: String,
        required: true
    },
    orders: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
        }
    ],
    isPayed: {
        type: Boolean,
        default: false
    }
});

const TableOrder =  mongoose.model("TableOrder", TableOrderSchema, "table_orders");
module.exports = TableOrder;