const express = require('express');
const {
    getMenuItems,
    toggleAvailability,
    editItem,
    addItem,
    deleteItem,
    getItem
} = require("../controllers/item.controller");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.get("/", verifyToken, getMenuItems);
router.get("/:id", verifyToken, getItem);
router.post("/", verifyToken, addItem);
router.put("/:id", verifyToken, editItem);
router.patch("/:id/availability", verifyToken, toggleAvailability);
router.delete("/:id", verifyToken, deleteItem);


module.exports = router;