const express = require("express");
const router = express.Router();
const saveOrder = require("../controllers/order.controller");

router.post("/", saveOrder);

module.exports = router;