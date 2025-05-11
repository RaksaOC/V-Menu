const Item = require("../models/Item");

const getItems = async (req, res) => {
    const items = await Item.find();
    return res.json(items);
}

module.exports = getItems;