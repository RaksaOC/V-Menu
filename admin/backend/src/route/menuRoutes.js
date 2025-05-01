const express = require('express');
const {getMenuItems, toggleAvailability} = require("../controller/menuController");

const router = express.Router();

router.get("/", getMenuItems);
router.put("/", toggleAvailability);

module.exports = router;