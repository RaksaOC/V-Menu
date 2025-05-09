// server/middleware/verifyToken.js
const admin = require("../firebase/admin");

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log(token);
    if (!token) return res.status(401).send({ message: "No token provided" });

    try {
        req.user = await admin.auth().verifyIdToken(token);
        next();
    } catch (err) {
        res.status(401).send({ message: "Invalid token" });
    }
};

module.exports = verifyToken;
