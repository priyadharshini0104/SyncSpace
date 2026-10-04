const mongoose = require('mongoose');
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
module.exports = mongoose.model('Document', DocumentSchema);
