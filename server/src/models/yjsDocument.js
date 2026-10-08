const mongoose = require("mongoose");

const yjsDocumentSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        documentType: {
            type: String,
            enum: [
                "code",
                "whiteboard",
                "combined"
            ],
            default: "combined"
        },

        state: {
            type: Buffer,
            required: true
        },

        version: {
            type: Number,
            default: 1
        }
    },
    {
        timestamps: true
    }
);

module.exports =
    mongoose.model(
        "YjsDocument",
        yjsDocumentSchema
    );