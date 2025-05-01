
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");

router.get("/protected", verifyToken, (req, res) => {
    res.send({ message: `Hello from backend, to get here u must have been verified` });
});

module.exports = router;
