const express = require("express");
const {getTableOrders, markTableOrderAsPayed} = require("../controller/tableOrdersController")
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

router.get("/", getTableOrders);
router.put("/", markTableOrderAsPayed);

module.exports = router;
