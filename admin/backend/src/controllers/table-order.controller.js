const {
    getAllTableOrders,
    markAsPaid,
    getPaidTableOrders
} = require("../services/table-order.services");

const getTableOrders = async (req, res) => {
    try {
        const tableOrders = await getAllTableOrders();
        return res.status(200).json(tableOrders);
    } catch (err) {
        console.error("Error fetching table orders:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

const markTableOrderAsPaid = async (req, res) => {
    const id = req.params.id;
    const { isPayed } = req.body;

    try {
        const updated = await markAsPaid(id, isPayed);

        if (!updated) {
            return res.status(404).json({ message: "Item not found" });
        }

        return res.status(200).json(updated);
    } catch (err) {
        console.error("Error marking order as paid:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const getPaidTableOrdersC = async (req, res) => {
    try {
        const tableOrders = await getPaidTableOrders();

        res.setHeader("Cache-Control", "no-store");

        if (!tableOrders || tableOrders.length === 0) {
            return res.status(404).json({ message: "No paid table orders found" });
        }

        return res.status(200).json(tableOrders);
    } catch (err) {
        console.error("Error getting paid orders:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getTableOrders,
    markTableOrderAsPaid,
    getPaidTableOrdersC
};
