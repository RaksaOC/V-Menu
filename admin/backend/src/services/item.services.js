// services/item.service.js
const Item = require('../models/Item');

const getAllItems = async () => {
    return await Item.find();
};

const toggleItemAvailability = async (_id, currentStatus) => {
    const updatedItem = await Item.findByIdAndUpdate(
        _id,
        { isAvailable: !currentStatus },
        { new: true }
    );

    return updatedItem;
};

const updateItem = async (id, name, price) => {
    const updatedItem = await Item.findByIdAndUpdate(
        id,
        { name, price },
        { new: true }
    );

    return updatedItem;
};

const createItem = async (name, price, image) => {
    const newItem = new Item({
        name,
        price,
        image,
        isEnabled: true
    });

    return await newItem.save();
};

const removeItem = async (id) => {
    const deletedItem =  await Item.findByIdAndDelete(id);
    return deletedItem;
};

const getItemById = async (id) => {
    const item = await Item.findById(id);
    return item;
};

module.exports = {
    getAllItems,
    toggleItemAvailability,
    updateItem,
    createItem,
    removeItem,
    getItemById
};
