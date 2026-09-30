const Session = require("../models/Session");

async function requireSessionAccess(
    req,
    res,
    next
) {
    try {
        const sessionId =
            req.params.sessionId ||
            req.body.sessionId;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required"
            });
        }

        const session =
            await Session.findOne({
                sessionId
            });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: "Session not found"
            });
        }

        const participant =
            session.participants.find(
                item =>
                    item.userId ===
                    req.user.userId
            );

        if (!participant) {
            return res.status(403).json({
                success: false,
                message:
                    "You do not have access to this session"
            });
        }

        req.session = session;
        req.participant = participant;

        next();

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    requireSessionAccess
};