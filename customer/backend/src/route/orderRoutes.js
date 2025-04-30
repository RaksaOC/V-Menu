const express = require("express");
const router = express.Router();
const saveOrder = require("../controller/orderController");

router.post("/", saveOrder);

module.exports = router;