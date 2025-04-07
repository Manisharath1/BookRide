const express = require("express");
const securityController = require("../controllers/securityController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/mark", authMiddleware, securityController.markInOut);

module.exports = router;