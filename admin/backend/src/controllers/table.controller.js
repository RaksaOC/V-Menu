// controllers/table.controllers.js
const tableService = require('../services/table.services');

const getTables = async (req, res) => {
    try {
        const tables = await tableService.getAllTables();
        res.json(tables);
    } catch (err) {
        console.error(err);
        res.status(500).send({});
    }
};

const toggleTableAvailability = async (req, res) => {
    const id = req.params.id;
    const isEnabled = req.body.isEnabled;
    try {
        const updated = await tableService.toggleAvailability(id, isEnabled);
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).send({});
    }
};

const addTable = async (req, res) => {
    try {
        const { type, name } = req.body;

        const added = type === 'manual'
            ? await tableService.addManualTable(name)
            : await tableService.addAutoTable();

        res.status(201).json(added);
    } catch (err) {
        console.error(err);
        const status = err.message.includes("not unique") ? 409 : 500;
        res.status(status).json({ message: err.message });
    }
};

const editTable = async (req, res) => {
    const id = req.params.id;
    const name = req.body.name;

    try {
        const updated = await tableService.editTableId(id, name);

        if (!updated) return res.status(404).json({ message: "TableCard not found" });

        res.status(200).json(updated);
    } catch (err) {
        console.error(err);
        const status = err.message.includes("taken") ? 409 : 500;
        res.status(status).json({ message: err.message });
    }
};

const deleteTable = async (req, res) => {
    try {
        const deleted = await tableService.deleteTableById(req.params.id);

        if (!deleted) return res.status(404).json({ message: "TableCard not found" });

        res.status(200).json(deleted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error deleting table" });
    }
};

module.exports = {
    getTables,
    toggleTableAvailability,
    addTable,
    editTable,
    deleteTable,
};
