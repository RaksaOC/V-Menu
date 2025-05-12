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
    isEnabled: {
        type: Boolean,
        required: true,
    }
});

const item = mongoose.models.Item || mongoose.model("Item", itemSchema);

module.exports = item;

