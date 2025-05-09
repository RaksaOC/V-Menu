const express = require("express");
const router = express.Router();
const {addTable, getTables, toggleTableAvailability, editTable, deleteTable} = require("../controller/tableController");
const verifyToken = require("../middleware/verifyToken");

router.get("/", verifyToken, getTables);
router.put("/", verifyToken, toggleTableAvailability);
router.put("/:id/edit",verifyToken,  editTable);
router.post("/add", verifyToken, addTable);
router.delete("/:id/delete", verifyToken, deleteTable);


module.exports = router;