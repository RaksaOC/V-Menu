const express = require('express');
const getItems = require('../controller/itemController');

const router = express.Router();

router.get("/:id", getItems);

module.exports = router;