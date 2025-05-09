const express = require("express");
const {getTableOrders, markTableOrderAsPayed, getPaidTableOrders} = require("../controller/tableOrdersController")
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

router.get("/", verifyToken, getTableOrders);
router.put("/", verifyToken, markTableOrderAsPayed);
router.get('/orderHistory', verifyToken, getPaidTableOrders);

module.exports = router;
