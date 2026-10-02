const express = require("express");
const Y = require("yjs");

const {
    saveYjsDocument,
    loadYjsDocument
} = require("../services/yjsPersistence");

const router = express.Router();

router.get("/test/:sessionId", async (req, res) => {
    try {
        const sessionId = req.params.sessionId;

        // Create Yjs document
        const doc = new Y.Doc();

        // Create a text field
        const text = doc.getText("code");

        // Add test data
        text.insert(
            0,
            "console.log('Hello SyncSpace');"
        );

        // Save Yjs document to MongoDB
        await saveYjsDocument(sessionId, doc);

        // Load Yjs document from MongoDB
        const restoredDoc = await loadYjsDocument(sessionId);

        // Read restored data
        const restoredText = restoredDoc
            .getText("code")
            .toString();

        res.json({
            success: true,
            message: "Yjs persistence test successful",
            sessionId,
            originalData: text.toString(),
            restoredData: restoredText
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;