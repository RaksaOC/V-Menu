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
    console.log("id to change", _id);

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

const editItem = async (req, res) => {
    const id = req.params.id;
    let updatedItem;
    try {
        updatedItem = await Item.findByIdAndUpdate(
            id,
            {
                name: req.body.name,
                price: req.body.price,
            },
            {new: true}
        )
        if (!updatedItem) {
            return res.status(404).json({message: 'Item not found'});
        }
        return res.status(200).json(updatedItem);
    } catch (err) {
        res.status(404).json({message: 'Item not found'});
        console.log(err);
    }
}

const addItem = async (req, res) => {
    let newItem = new Item(req.body);
    try {
        const result = await newItem.save();
        return res.status(200).json(result);
    } catch (err) {
        res.status(404).json({message: 'Error adding item'});
        console.log(err);
    }
}

const deleteItem = async (req, res) => {
    const id = req.params.id;
    try {
        const result = await Item.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({message: 'Item not found'});
        }
        return res.status(200).json(result);
    }catch (err) {
        console.log(err);
        return res.status(404).json({message: 'Error deleting item'});
    }
}

module.exports = {getMenuItems, toggleAvailability, editItem, addItem, deleteItem};