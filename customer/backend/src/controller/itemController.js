const Item = require("../model/itemModel");

const getItems = async (req, res) => {
    const items = await Item.find();
    return res.json(items);
}

module.exports = getItems;