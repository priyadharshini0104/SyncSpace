const Session = require("../models/Session");

const createSession = async (req, res) => {
    try {
        const {
            sessionId,
            name,
            ownerId
        } = req.body;

        const session = await Session.create({
            sessionId,
            name,
            ownerId,
            participants: [
                {
                    userId: ownerId,
                    role: "owner"
                }
            ]
        });

        res.status(201).json({
            success: true,
            session
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getSession = async (req, res) => {
    try {
        const session = await Session.findOne({
            sessionId: req.params.sessionId
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        res.json({
            success: true,
            session
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    createSession,
    getSession
};