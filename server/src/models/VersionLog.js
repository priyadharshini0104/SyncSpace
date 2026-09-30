const mongoose = require("mongoose");

const versionLogSchema =
    new mongoose.Schema(
        {
            sessionId: {
                type: String,
                required: true,
                index: true
            },

            version: {
                type: Number,
                required: true
            },

            previousVersion: {
                type: Number,
                default: null
            },

            createdBy: {
                type: String,
                required: true
            },

            action: {
                type: String,
                enum: [
                    "create",
                    "update",
                    "snapshot",
                    "rewind"
                ],
                required: true
            },

            metadata: {
                type: mongoose.Schema.Types.Mixed,
                default: {}
            }
        },
        {
            timestamps: true
        }
    );

versionLogSchema.index({
    sessionId: 1,
    version: 1
});

module.exports =
    mongoose.model(
        "VersionLog",
        versionLogSchema
    );