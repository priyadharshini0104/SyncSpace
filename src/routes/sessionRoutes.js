const express = require("express");

const {
    createSession,
    getSession
} = require("../controllers/sessionController");

const router = express.Router();

router.post("/", createSession);

router.get("/:sessionId", getSession);

module.exports = router;