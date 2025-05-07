const express = require('express');
const {getMenuItems, toggleAvailability, editItem, addItem, deleteItem, getItem} = require("../controller/menuController");

const router = express.Router();

router.get("/", getMenuItems);
router.put("/", toggleAvailability);
router.put("/:id/edit", editItem);
router.post("/add", addItem);
router.delete("/:id/delete", deleteItem);
router.get("/:id", getItem);

module.exports = router;