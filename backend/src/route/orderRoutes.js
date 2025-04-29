const express = require("express");
const router = express.Router();
const saveOrder = require("../controller/orderController");

router.post("/order", saveOrder);

module.exports = router;