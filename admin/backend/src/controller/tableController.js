const Table = require('../model/tableModel');

const getTables = async (req, res) => {
    try {
        const tables = await Table.find();
        return res.json(tables);
    }catch(err) {
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
    }catch(err) {
        res.status(500).send({})
        console.log(err);
    }
}

module.exports = {getTables, toggleTableAvailability}