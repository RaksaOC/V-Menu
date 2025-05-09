const express = require("express");
const router = express.Router();
const {getOrders, markOrderAsDone, getOrdersHistory} = require("../controller/orderController");

router.get("/", getOrders);
router.get("/ordersHistory", getOrdersHistory);
router.put("/", markOrderAsDone);

module.exports = router;