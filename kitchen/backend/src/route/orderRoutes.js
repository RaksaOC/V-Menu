const express = require("express");
const router = express.Router();
const {getOrders, markOrderAsDone} = require("../controller/orderController");

router.get("/", getOrders);
router.put("/", markOrderAsDone);

module.exports = router;