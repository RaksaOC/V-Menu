// services/table.services.js
const Table = require('../models/Table');

const getAllTables = async () => {
    const tables =  await Table.find();
    return tables;
};

const toggleAvailability = async (_id, isEnabled) => {
    const updatedTable = await Table.findByIdAndUpdate(_id, { isEnabled: !isEnabled }, { new: true });
    return updatedTable;
};

const addManualTable = async (name) => {
    const isTaken = await Table.exists({ name: name });
    if (isTaken) throw new Error("TableCard name is not unique");

    const newTable = new Table({ name: name, isEnabled: false });
    return await newTable.save();
};

const addAutoTable = async () => {
    const allTables = await Table.find();
    let nextId;
    if (allTables.length === 0) {
        nextId = 1
        const newTable = new Table({ name: nextId.toString(), isEnabled: false });
        return await newTable.save();
    }
    const numericIds = allTables.map(t => parseInt(t.name)).filter(id => !isNaN(id));
    nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    console.log("nextId is", nextId);

    const newTable = new Table({ name: nextId.toString(), isEnabled: false });
    return await newTable.save();
};

const editTableId = async (id, newName) => {
    const table = await Table.findById(id);
    if (!table) return null;

    const isTaken = await Table.exists({ name: newName });
    if (isTaken) throw new Error("TableCard name is already taken");

    table.name = newName;
    return await table.save();
};

const deleteTableById = async (id) => {
    return await Table.findByIdAndDelete(id);
};

module.exports = {
    getAllTables,
    toggleAvailability,
    addManualTable,
    addAutoTable,
    editTableId,
    deleteTableById,
};
