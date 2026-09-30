const jwt = require("jsonwebtoken");

function generateToken(user) {
    return jwt.sign(
        {
            userId: user.userId,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d"
        }
    );
}

function verifyToken(token) {
    return jwt.verify(
        token,
        process.env.JWT_SECRET
    );
}

module.exports = {
    generateToken,
    verifyToken
};