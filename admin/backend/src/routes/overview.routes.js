const router = require("express").Router();
const {overview} = require("../controllers/overview.controller");

router.get("/", overview);

module.exports = router;