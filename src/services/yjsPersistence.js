const Y = require("yjs");
const YjsDocument = require("../models/YjsDocument");

async function saveYjsDocument(sessionId, doc) {
    const update = Y.encodeStateAsUpdate(doc);

    await YjsDocument.findOneAndUpdate(
        { sessionId },

        {
            sessionId,
            state: Buffer.from(update),
            version: 1
        },

        {
            upsert: true,
            new: true
        }
    );

    console.log(`Yjs document saved for session: ${sessionId}`);
}


async function loadYjsDocument(sessionId) {
    const storedDocument = await YjsDocument.findOne({
        sessionId
    });

    const doc = new Y.Doc();

    if (!storedDocument) {
        return doc;
    }

    const update = new Uint8Array(
        storedDocument.state
    );

    Y.applyUpdate(doc, update);

    return doc;
}


module.exports = {
    saveYjsDocument,
    loadYjsDocument
};