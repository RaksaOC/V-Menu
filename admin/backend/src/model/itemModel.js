const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    image: String,
    isAvailable: {
        type: Boolean,
        required: true,
    }
});

const item = mongoose.model("Item", itemSchema);

module.exports = item;

