const Item = require("../model/itemModel");

const getItems = async (req, res) => {
    console.log("getting items to display for customer at table", req.params.id);
    const items = await Item.find();
    return res.json(items);
}

module.exports = getItems;