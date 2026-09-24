import Document from '../models/Document.js';
export async function getDocumentState(req, res) {
  try {
    const { roomId } = req.params;
    const doc = await Document.findOne({ roomId });
    if (!doc) {
      return res.status(404).json({ message: 'Document not found for this room' });
    }
    return res.status(200).json({ roomId: doc.roomId, data: doc.data, updatedAt: doc.updatedAt });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve document state', details: err.message });
  }
}
export async function saveDocumentState(req, res) {
  try {
    const { roomId } = req.params;
    const { data } = req.body;
    const updated = await Document.findOneAndUpdate(
      { roomId },
      { data: Buffer.from(data), updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return res.status(200).json({ success: true, document: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save document state', details: err.message });
  }
}
