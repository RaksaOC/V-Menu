const express = require("express");
const router = express.Router();
const {getTables, toggleTableAvailability} = require("../controller/tableController");

router.get("/", getTables);
router.put("/", toggleTableAvailability);

module.exports = router;