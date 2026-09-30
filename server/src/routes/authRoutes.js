const express = require("express");

const {
    register,
    login
} = require("../controllers/authController");

const {
    authenticate
} = require("../middleware/auth");

const router = express.Router();

router.post(
    "/register",
    register
);

router.post(
    "/login",
    login
);

router.get(
    "/me",
    authenticate,
    (req, res) => {
        res.json({
            success: true,
            user: req.user
        });
    }
);

module.exports = router;