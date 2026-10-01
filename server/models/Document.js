const mongoose = require('mongoose');

// The Replay Buffer Schema (Stores individual incremental updates)
const DocumentUpdateSchema = new mongoose.Schema(
  {
    docId: {
      type: String,
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true
    },
    updateBuffer: {
      type: Buffer,
      required: true
    }
  },
  {timestamps: true}
);

// compound index to quickly fetch missing sequence ranges per document
DocumentUpdateSchema.index({docId: 1, version: 1}, {unique: true});
const DocumentUpdate = mongoose.model('DocumentUpdate', DocumentUpdateSchema);

const DocumentSchema = new mongoose.Schema(
  {
    docId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      default: 'Untitled Document'
    },
    // Tracks the current global sequence/version index
    currentVersion: {
      type: Number,
      default: 0
    },
    // Binary buffer to store serialized Yjs update states
    yjsState: {
      type: Buffer,
      default: Buffer.alloc(0)
    },
    activeUsers: [
      {
        userId: String,
        username: String,
        lastActive: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);
DocumentSchema.methods.updateYjsState = function (updateBuffer) {
  this.yjsState = updateBuffer;
  return this.save();
};

// Appends a new delta to the replay buffer and increments the document index.
DocumentSchema.static.appendUpdate = async function(docId, incrementalBuffer) {
  // increment the version index in the Document
  const doc = await this.findOneAndUpdate(
    {docId}, {$inc: {currentVersion: 1}}, {new: true, upsert: true}
  );

  // insert the updateBuffer inside DocumentUpdate with new version number
  const replayLog = new DocumentUpdate({
    docId,
    version: doc.currentVersion,
    updateBuffer: incrementalBuffer
  });

  await replayLog.save();
  return doc;
}

// Fetches all missed deltas since a specific version index
DocumentSchema.static.getUpdatesSince = async function(docId, contextVersion) {
  return DocumentUpdate.find({
    docId,
    version: {$gt: contextVersion}
  }).sort({version: 1});
}

module.exports = mongoose.model('Document', DocumentSchema);
