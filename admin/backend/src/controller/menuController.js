const Item = require("../model/itemModel");

const getMenuItems = async (req, res) => {
    const items = await Item.find();
    return res.json(items);
}

const toggleAvailability = async (req, res) => {
    console.log("toggleAvailability function triggered");
    console.log(req.body);
    const {_id, isAvailable} = req.body;
    console.log("item status to change", isAvailable);
    console.log("id to change",_id);

    let updatedItem;
    try {
        updatedItem = await Item.findByIdAndUpdate(
            _id,
            {isAvailable: !isAvailable},
            {new: true}
        )
        console.log("after update", updatedItem);
        if (!updatedItem) {
            return res.status(404).json({message: 'Item not found'});
        }

    } catch (err) {
        console.log(err);
    }

    res.status(200).json(updatedItem);
}

module.exports = {getMenuItems, toggleAvailability};