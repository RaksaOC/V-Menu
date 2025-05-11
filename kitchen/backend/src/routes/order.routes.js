const express = require("express");
const router = express.Router();
const {getOrders, markOrderAsDone, getOrdersHistory} = require("../controllers/order.controller");

router.get("/", getOrders);
router.get("/history", getOrdersHistory);
router.patch("/:id", markOrderAsDone);

module.exports = router;