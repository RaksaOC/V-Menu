const express = require('express');
const {
    getMenuItems,
    toggleAvailability,
    editItem,
    addItem,
    deleteItem,
    getItem
} = require("../controller/menuController");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.get("/", verifyToken, getMenuItems);
router.put("/", verifyToken, toggleAvailability);
router.put("/:id/edit", verifyToken, editItem);
router.post("/add", verifyToken, addItem);
router.delete("/:id/delete", verifyToken, deleteItem);
router.get("/:id", verifyToken, getItem);

module.exports = router;