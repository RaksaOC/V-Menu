const express = require('express');
const getItems = require('../controllers/item.controller');

const router = express.Router();

router.get("/", getItems);

module.exports = router;