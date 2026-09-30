const Session = require("../models/Session");

const createSession = async (req, res) => {
    try {
        const {
            sessionId,
            name,
            ownerId
        } = req.body;

        if (!sessionId || !name || !ownerId) {
            return res.status(400).json({
                success: false,
                message: "sessionId, name and ownerId are required"
            });
        }

        const existingSession = await Session.findOne({
            sessionId
        });

        if (existingSession) {
            return res.status(409).json({
                success: false,
                message: "Session already exists"
            });
        }

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
        console.error("Create session error:", error);

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
        console.error("Get session error:", error);

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