const Table = require('../model/tableModel');

const getTables = async (req, res) => {
    try {
        const tables = await Table.find();
        return res.json(tables);
    } catch (err) {
        res.status(500).send({})
        console.log(err);
    }
}

const toggleTableAvailability = async (req, res) => {
    try {
        const {_id, isEnabled} = req.body;
        const updatedTables = await Table.findByIdAndUpdate(
            _id,
            {isEnabled: isEnabled},
            {new: true}
        );
        return res.json(updatedTables);
    } catch (err) {
        res.status(500).send({})
        console.log(err);
    }
}

const addTable = async (req, res) => {
    const {type, name} = req.body;

    if (type === 'manual') {
        try {
            const isTaken = await Table.exists({id: name});
            if (isTaken) {
                return res.status(409).json({message: "Table name is not unique"});
            }

            const newTable = new Table({id: name, isEnabled: false});
            const addedTable = await newTable.save();
            return res.status(201).json(addedTable);
        } catch (err) {
            console.error(err);
            return res.status(500).json({message: "Error creating table"});
        }
    }

    // Auto mode
    try {
        const allTables = await Table.find();
        const numericIds = allTables.map(t => parseInt(t.id)).filter(id => id); // keep only valid numbers
        const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 1;

        const newTable = new Table({id: nextId.toString(), isEnabled: false});
        const addedTable = await newTable.save();
        return res.status(201).json(addedTable);
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Error creating table"});
    }
};

const editTable = async (req, res) => {
    const currentId = req.params.id;
    const { name } = req.body;

    try {
        const table = await Table.findOne({ _id: currentId });
        console.log("Found table:", table);

        if (!table) {
            return res.status(404).json({ message: "Table not found" });
        }

        const isTaken = await Table.exists({ id: name });
        if (isTaken) {
            return res.status(409).json({ message: "Table name is already taken" });
        }

        table.id = name;
        const updated = await table.save();

        return res.status(200).json(updated);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error updating table" });
    }
};


const deleteTable = async (req, res) => {
    const {id} = req.params;
    try {
        const result = await Table.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({message: "Table not found"});
        }
        return res.status(200).json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({message: "Error deleting table"});
    }
}


module.exports = {getTables, toggleTableAvailability, editTable, addTable, deleteTable};