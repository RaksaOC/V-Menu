const express = require("express");
const router = express.Router();
const {addTable, getTables, toggleTableAvailability, editTable, deleteTable} = require("../controllers/table.controller");
const verifyToken = require("../middleware/verifyToken");

router.get("/", verifyToken, getTables);
router.post("/", verifyToken, addTable);
router.patch("/:id/availability", verifyToken, toggleTableAvailability);
router.put("/:id",verifyToken,  editTable);
router.delete("/:id", verifyToken, deleteTable);

module.exports = router;