const express = require("express");
const router = express.Router();
const {isTableOpened} = require('../controllers/table.controller');

router.get('/:id', isTableOpened);

module.exports = router;