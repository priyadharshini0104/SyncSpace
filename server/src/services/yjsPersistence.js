const Y = require("yjs");

const YjsDocument =
    require("../models/yjsDocument");


async function saveYjsDocument(
    sessionId,
    doc,
    documentType = "combined"
) {
    const update =
        Y.encodeStateAsUpdate(doc);

    const existingDocument =
        await YjsDocument.findOne({
            sessionId
        });

    const version =
        existingDocument
            ? existingDocument.version + 1
            : 1;

    const savedDocument =
        await YjsDocument.findOneAndUpdate(
            {
                sessionId
            },
            {
                sessionId,
                documentType,
                state: Buffer.from(update),
                version
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

    console.log(
        `Yjs document saved: ${sessionId}`
    );

    return savedDocument;
}


async function loadYjsDocument(
    sessionId
) {
    const storedDocument =
        await YjsDocument.findOne({
            sessionId
        });

    const doc = new Y.Doc();

    if (!storedDocument) {
        return doc;
    }

    const update =
        new Uint8Array(
            storedDocument.state
        );

    Y.applyUpdate(
        doc,
        update
    );

    console.log(
        `Yjs document loaded: ${sessionId}`
    );

    return doc;
}


async function getYjsMetadata(
    sessionId
) {
    return await YjsDocument.findOne(
        {
            sessionId
        },
        {
            state: 0
        }
    );
}


module.exports = {
    saveYjsDocument,
    loadYjsDocument,
    getYjsMetadata
};