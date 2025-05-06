const express = require("express");
const router = express.Router();
const {addTable, getTables, toggleTableAvailability, editTable, deleteTable} = require("../controller/tableController");

router.get("/", getTables);
router.put("/", toggleTableAvailability);
router.put("/:id/edit", editTable);
router.post("/add", addTable);
router.delete("/:id/delete", deleteTable);


module.exports = router;