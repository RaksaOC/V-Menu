// controllers/item.controllers.js
const itemService = require('../services/item.services');

const getMenuItems = async (req, res) => {
    try {
        const items = await itemService.getAllItems();
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to retrieve menu items' });
    }
};

const toggleAvailability = async (req, res) => {
    const {isEnabled} = req.body;
    const id = req.params.id;
    try {
        const updated = await itemService.toggleItemAvailability(id, isEnabled);
        if (!updated) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to toggle availability' });
    }
};

const editItem = async (req, res) => {
    const id = req.params.id;
    const {name, price} = req.body;
    try {
        const updated = await itemService.updateItem(id, name, price);
        if (!updated) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update item' });
    }
};

const addItem = async (req, res) => {
    const {name, price, image} = req.body;
    try {
        const created = await itemService.createItem(name, price, image);
        res.status(201).json(created);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add item' });
    }
};

const deleteItem = async (req, res) => {
    const id = req.params.id;
    try {
        const deleted = await itemService.removeItem(id);
        if (!deleted) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(deleted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete item' });
    }
};

const getItem = async (req, res) => {
    const id = req.params.id;
    try {
        const item = await itemService.getItemById(id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.status(200).json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to get item' });
    }
};

module.exports = {
    getMenuItems,
    toggleAvailability,
    editItem,
    addItem,
    deleteItem,
    getItem
};
