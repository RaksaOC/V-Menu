const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    }
});

const Table = mongoose.model('Table', tableSchema);

module.exports = Table;