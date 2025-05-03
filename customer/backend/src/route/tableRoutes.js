const express = require("express");
const router = express.Router();
const {isTableOpened} = require('../controller/tableController');

router.get('/:id', isTableOpened);

module.exports = router;