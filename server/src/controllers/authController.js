const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const { generateToken } =
    require("../utils/jwt");


async function register(req, res) {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        if (
            !name ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "name, email and password are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must contain at least 6 characters"
            });
        }

        const existingUser =
            await User.findOne({
                email: email.toLowerCase()
            });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists"
            });
        }

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );

        const user =
            await User.create({
                userId: crypto.randomUUID(),
                name,
                email:
                    email.toLowerCase(),
                passwordHash
            });

        const token =
            generateToken(user);

        res.status(201).json({
            success: true,

            token,

            user: {
                userId: user.userId,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


async function login(req, res) {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "email and password are required"
            });
        }

        const user =
            await User.findOne({
                email: email.toLowerCase()
            });

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid credentials"
            });
        }

        const validPassword =
            await bcrypt.compare(
                password,
                user.passwordHash
            );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid credentials"
            });
        }

        const token =
            generateToken(user);

        res.json({
            success: true,

            token,

            user: {
                userId: user.userId,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}


module.exports = {
    register,
    login
};