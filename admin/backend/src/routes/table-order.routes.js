const express = require("express");
const {getTableOrders, markTableOrderAsPaid, getPaidTableOrdersC} = require("../controllers/table-order.controller")
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

router.get("/", verifyToken, getTableOrders);
router.get("/paid", verifyToken, getPaidTableOrdersC);
router.patch("/:id/pay", verifyToken, markTableOrderAsPaid);

module.exports = router;
