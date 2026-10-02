const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["owner", "interviewer", "candidate", "viewer"],
            default: "viewer"
        },

        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        _id: false
    }
);

const sessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        ownerId: {
            type: String,
            required: true,
            index: true
        },

        participants: {
            type: [participantSchema],
            default: []
        },

        status: {
            type: String,
            enum: ["active", "ended", "archived"],
            default: "active",
            index: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Session", sessionSchema);