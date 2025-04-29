const express = require("express");
const router = express.Router();
const getOrders = require("../controller/orderController");

router.get("/", getOrders);

module.exports = router;