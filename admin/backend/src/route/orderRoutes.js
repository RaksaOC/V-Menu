const express = require("express");
const {getTableOrders, markTableOrderAsPayed, getPaidTableOrders} = require("../controller/tableOrdersController")
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

router.get("/", getTableOrders);
router.put("/", markTableOrderAsPayed);
router.get('/orderHistory', getPaidTableOrders);

module.exports = router;
